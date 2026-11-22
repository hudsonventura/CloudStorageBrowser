using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Infrastructure.Services;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class FolderStatsServiceTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _datasetDir;
    private readonly AppDbContext _context;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly FolderStatsChannel _channel;
    private readonly FolderStatsService _folderStatsService;
    private readonly DatasetConfig _dataset;

    public FolderStatsServiceTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"stats_test_{Guid.NewGuid():N}");
        _datasetDir = Path.Combine(_testRoot, "dataset");
        Directory.CreateDirectory(_datasetDir);

        var services = new ServiceCollection();
        var dbPath = Path.Combine(_testRoot, "stats_test.db");
        services.AddDbContext<AppDbContext>(options => options.UseSqlite($"Data Source={dbPath}"));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        var sp = services.BuildServiceProvider();
        _scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        }

        _context = sp.GetRequiredService<AppDbContext>();

        _dataset = new DatasetConfig
        {
            Id = 1,
            Name = "TestDataset",
            Path = _datasetDir,
            AccessMode = DatasetAccessMode.ReadWrite
        };
        _context.Datasets.Add(_dataset);
        _context.SaveChanges();

        _channel = new FolderStatsChannel();
        _folderStatsService = new FolderStatsService(_channel, _scopeFactory, NullLogger<FolderStatsService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_testRoot))
        {
            try { Directory.Delete(_testRoot, recursive: true); } catch { }
        }
    }

    [Fact]
    public async Task GetFolderStatsAsync_ReturnsPendingAndEnqueuesWhenMissing()
    {
        var stats = await _folderStatsService.GetFolderStatsAsync(1, "my-folder", queueIfMissing: true);
        Assert.NotNull(stats);
        Assert.True(stats.IsCalculating);
        Assert.True(_channel.IsEnqueuedOrRunning(1, "my-folder"));
    }

    [Fact]
    public async Task InvalidateAndRecalculateAncestorsAsync_MarksAncestorsStale()
    {
        // Setup initial cache
        await _folderStatsService.GetFolderStatsAsync(1, "alpha/beta/gamma", queueIfMissing: true);
        await _folderStatsService.GetFolderStatsAsync(1, "alpha/beta", queueIfMissing: true);
        await _folderStatsService.GetFolderStatsAsync(1, "alpha", queueIfMissing: true);
        await _folderStatsService.GetFolderStatsAsync(1, "", queueIfMissing: true);

        // Invalidate from child file
        await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(1, "alpha/beta/gamma/file.txt");

        var alphaStats = await _folderStatsService.GetFolderStatsAsync(1, "alpha", queueIfMissing: false);
        Assert.NotNull(alphaStats);
        Assert.True(alphaStats.IsStale);

        var rootStats = await _folderStatsService.GetFolderStatsAsync(1, "", queueIfMissing: false);
        Assert.NotNull(rootStats);
        Assert.True(rootStats.IsStale);
    }

    [Fact]
    public async Task Worker_CalculatesDirectoryTreeCorrectly_AndSkipsZfs()
    {
        // Create directory structure:
        // /dataset
        //   /folderA (file1: 100 bytes, file2: 200 bytes)
        //   /folderA/subFolder (file3: 300 bytes)
        //   /folderA/.zfs/snapshot/snap1 (fileIgnored: 9999 bytes)
        var folderA = Path.Combine(_datasetDir, "folderA");
        var subFolder = Path.Combine(folderA, "subFolder");
        var zfsDir = Path.Combine(folderA, ".zfs", "snapshot", "snap1");

        Directory.CreateDirectory(subFolder);
        Directory.CreateDirectory(zfsDir);

        File.WriteAllBytes(Path.Combine(folderA, "file1.bin"), new byte[100]);
        File.WriteAllBytes(Path.Combine(folderA, "file2.bin"), new byte[200]);
        File.WriteAllBytes(Path.Combine(subFolder, "file3.bin"), new byte[300]);
        File.WriteAllBytes(Path.Combine(zfsDir, "fileIgnored.bin"), new byte[9999]);

        // Create a mocked dataset manager
        var datasetManagerServices = new ServiceCollection();
        datasetManagerServices.AddDbContext<AppDbContext>(options =>
            options.UseSqlite($"Data Source={Path.Combine(_testRoot, "stats_test.db")}"));
        datasetManagerServices.AddScoped<IAppDbContext>(s => s.GetRequiredService<AppDbContext>());

        var snapService = new ZfsSnapshotService(NullLogger<ZfsSnapshotService>.Instance);
        var storService = new PhysicalStorageService(snapService, NullLogger<PhysicalStorageService>.Instance);
        var inMemoryConfig = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { { "DATASETS_DIR", _testRoot } })
            .Build();

        datasetManagerServices.AddScoped<IDatasetManager>(s => new DatasetManager(
            s.GetRequiredService<AppDbContext>(), storService, snapService, inMemoryConfig, NullLogger<DatasetManager>.Instance));

        var dmSp = datasetManagerServices.BuildServiceProvider();
        var dmScopeFactory = dmSp.GetRequiredService<IServiceScopeFactory>();

        var worker = new FolderStatsBackgroundWorker(
            _channel, _folderStatsService, dmScopeFactory, NullLogger<FolderStatsBackgroundWorker>.Instance);

        // Enqueue task for folderA
        _channel.TryEnqueue(new FolderCalculationTask(1, "folderA", null, true));

        // Start worker briefly
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
        var runTask = worker.StartAsync(cts.Token);

        // Wait until task is processed
        var attempts = 0;
        FolderStatsDto? stats = null;
        while (attempts < 20)
        {
            stats = await _folderStatsService.GetFolderStatsAsync(1, "folderA", queueIfMissing: false);
            if (stats != null && !stats.IsCalculating && stats.TotalBytes > 0)
            {
                break;
            }
            await Task.Delay(100);
            attempts++;
        }

        await worker.StopAsync(CancellationToken.None);

        Assert.NotNull(stats);
        Assert.False(stats.IsCalculating);
        // Total bytes should be 100 + 200 + 300 = 600 bytes (.zfs excluded!)
        Assert.Equal(600, stats.TotalBytes);
        // Files count: 3 files (file1, file2, file3)
        Assert.Equal(3, stats.FilesCount);
        // Subdirs count: 1 (subFolder)
        Assert.Equal(1, stats.DirectoriesCount);
        Assert.Equal(4, stats.TotalSubitemsCount);
    }
}
