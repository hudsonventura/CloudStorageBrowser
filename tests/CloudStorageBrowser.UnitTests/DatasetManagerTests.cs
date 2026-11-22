using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Infrastructure.Services;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class DatasetManagerTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _datasetsDir;
    private readonly AppDbContext _context;
    private readonly DatasetManager _datasetManager;

    public DatasetManagerTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"dm_test_{Guid.NewGuid():N}");
        _datasetsDir = Path.Combine(_testRoot, "datasets");
        Directory.CreateDirectory(_datasetsDir);

        var dbPath = Path.Combine(_testRoot, "test.db");
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={dbPath}")
            .Options;

        _context = new AppDbContext(dbOptions);
        _context.Database.EnsureCreated();

        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "DATASETS_DIR", _datasetsDir }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemoryConfig)
            .Build();

        var snapshotService = new ZfsSnapshotService(NullLogger<ZfsSnapshotService>.Instance);
        var storageService = new PhysicalStorageService(snapshotService, NullLogger<PhysicalStorageService>.Instance);

        _datasetManager = new DatasetManager(
            _context,
            storageService,
            snapshotService,
            configuration,
            NullLogger<DatasetManager>.Instance
        );
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
    public async Task RescanDatasetsAsync_DetectsAndRegistersActiveVolumes()
    {
        // Setup 2 mapped dataset folders
        var vol1 = Path.Combine(_datasetsDir, "dados");
        var vol2 = Path.Combine(_datasetsDir, "backup:ro");
        Directory.CreateDirectory(vol1);
        Directory.CreateDirectory(vol2);

        await _datasetManager.RescanDatasetsAsync();

        var datasets = await _datasetManager.GetAllDatasetsAsync();
        Assert.Equal(2, datasets.Count);
        Assert.Contains(datasets, d => d.Name == "dados" && d.AccessMode == DatasetAccessMode.ReadWrite);
        Assert.Contains(datasets, d => d.Name == "backup" && d.AccessMode == DatasetAccessMode.ReadOnly);
    }

    [Fact]
    public async Task RescanDatasetsAsync_RemovesUnmappedDatasets_WhenVolumeIsUnmounted()
    {
        // Initially 2 volumes mapped
        var vol1 = Path.Combine(_datasetsDir, "pool1");
        var vol2 = Path.Combine(_datasetsDir, "pool2");
        Directory.CreateDirectory(vol1);
        Directory.CreateDirectory(vol2);

        await _datasetManager.RescanDatasetsAsync();
        var initialDatasets = await _datasetManager.GetAllDatasetsAsync();
        Assert.Equal(2, initialDatasets.Count);

        // Simulate unmapping pool2 (directory deleted or unmounted)
        Directory.Delete(vol2, recursive: true);

        // Next scan should remove pool2
        var updatedDatasets = await _datasetManager.GetAllDatasetsAsync();
        Assert.Single(updatedDatasets);
        Assert.Equal("pool1", updatedDatasets[0].Name);

        // Also check DB entity directly
        var inDb = await _context.Datasets.ToListAsync();
        Assert.Single(inDb);
        Assert.Equal("pool1", inDb[0].Name);
    }

    [Fact]
    public async Task GetDatasetByIdAsync_ReturnsNull_WhenDatasetPathDoesNotExist()
    {
        var vol = Path.Combine(_datasetsDir, "poolTemp");
        Directory.CreateDirectory(vol);

        await _datasetManager.RescanDatasetsAsync();
        var datasets = await _datasetManager.GetAllDatasetsAsync();
        var id = datasets[0].Id;

        // Unmount
        Directory.Delete(vol, recursive: true);

        var result = await _datasetManager.GetDatasetByIdAsync(id);
        Assert.Null(result);
    }
}
