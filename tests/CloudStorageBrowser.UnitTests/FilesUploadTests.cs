using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Infrastructure.Services;
using CloudStorageBrowser.Infrastructure.Storage;
using CloudStorageBrowser.Web.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class FilesUploadTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _datasetsDir;
    private readonly AppDbContext _context;
    private readonly DatasetManager _datasetManager;
    private readonly PhysicalStorageService _storageService;
    private readonly FolderStatsService _folderStatsService;
    private readonly FilesController _controller;

    public FilesUploadTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"upload_test_{Guid.NewGuid():N}");
        _datasetsDir = Path.Combine(_testRoot, "datasets");
        Directory.CreateDirectory(_datasetsDir);

        var writablePath = Path.Combine(_datasetsDir, "writable");
        Directory.CreateDirectory(writablePath);

        var roPath = Path.Combine(_datasetsDir, "readonly");
        Directory.CreateDirectory(roPath);

        var dbPath = Path.Combine(_testRoot, "upload_test.db");
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={dbPath}")
            .Options;

        _context = new AppDbContext(dbOptions);
        _context.Database.EnsureCreated();

        var snapService = new ZfsSnapshotService(NullLogger<ZfsSnapshotService>.Instance);
        var inMemConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { { "DATASETS_DIR", _datasetsDir } })
            .Build();

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opt => opt.UseSqlite($"Data Source={dbPath}"));
        services.AddScoped<IAppDbContext>(s => s.GetRequiredService<AppDbContext>());
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var channel = new FolderStatsChannel();
        _folderStatsService = new FolderStatsService(channel, scopeFactory, NullLogger<FolderStatsService>.Instance);
        _storageService = new PhysicalStorageService(snapService, NullLogger<PhysicalStorageService>.Instance, _folderStatsService);

        _datasetManager = new DatasetManager(_context, _storageService, snapService, inMemConfig, NullLogger<DatasetManager>.Instance);

        var dsWritable = new DatasetConfig
        {
            Id = 1,
            Name = "writable",
            Path = writablePath,
            AccessMode = DatasetAccessMode.ReadWrite
        };
        var dsRo = new DatasetConfig
        {
            Id = 2,
            Name = "readonly",
            Path = roPath,
            AccessMode = DatasetAccessMode.ReadOnly
        };

        _context.Datasets.AddRange(dsWritable, dsRo);
        _context.SaveChanges();

        _controller = new FilesController(_storageService, _datasetManager, _folderStatsService);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_testRoot))
        {
            try { Directory.Delete(_testRoot, recursive: true); } catch { }
        }
    }

    private static IFormFile CreateTestFormFile(string fileName, string content)
    {
        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(content));
        return new FormFile(stream, 0, stream.Length, "files", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "text/plain"
        };
    }

    [Fact]
    public async Task Upload_WithFilesList_UploadsSuccessfully()
    {
        var files = new List<IFormFile>
        {
            CreateTestFormFile("test1.txt", "hello 1"),
            CreateTestFormFile("test2.txt", "hello 2")
        };

        var result = await _controller.Upload(1, "subfolder", null, files, null);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var ds = await _datasetManager.GetDatasetByIdAsync(1);
        Assert.True(File.Exists(Path.Combine(ds!.Path, "subfolder", "test1.txt")));
        Assert.True(File.Exists(Path.Combine(ds!.Path, "subfolder", "test2.txt")));
    }

    [Fact]
    public async Task Upload_WithSingleFile_AndDirectoryField_UploadsSuccessfully()
    {
        var singleFile = CreateTestFormFile("single.txt", "single content");

        // Simulating the way frontend sent 'directory' and 'file'
        var result = await _controller.Upload(1, null, "docs", null, singleFile);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var ds = await _datasetManager.GetDatasetByIdAsync(1);
        Assert.True(File.Exists(Path.Combine(ds!.Path, "docs", "single.txt")));
    }

    [Fact]
    public async Task Upload_ToReadOnlyDataset_ReturnsForbidden()
    {
        var files = new List<IFormFile> { CreateTestFormFile("test.txt", "content") };
        var result = await _controller.Upload(2, "", null, files, null);
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    [Fact]
    public async Task Upload_WithEmptyFiles_ReturnsBadRequest()
    {
        var result = await _controller.Upload(1, "", null, new List<IFormFile>(), null);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
    }
}
