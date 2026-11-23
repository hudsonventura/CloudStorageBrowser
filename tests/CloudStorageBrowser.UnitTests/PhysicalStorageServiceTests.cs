using CloudStorageBrowser.Application.Common.Models;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class PhysicalStorageServiceTests : IDisposable
{
    private readonly string _tempDir;
    private readonly PhysicalStorageService _storageService;
    private readonly DatasetConfig _writableDataset;
    private readonly DatasetConfig _readOnlyDataset;

    public PhysicalStorageServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"storage_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        var mockSnapshotService = new ZfsSnapshotService(NullLogger<ZfsSnapshotService>.Instance);
        _storageService = new PhysicalStorageService(mockSnapshotService, NullLogger<PhysicalStorageService>.Instance);

        _writableDataset = new DatasetConfig
        {
            Id = 1,
            Name = "Writable",
            Path = _tempDir,
            AccessMode = DatasetAccessMode.ReadWrite
        };

        _readOnlyDataset = new DatasetConfig
        {
            Id = 2,
            Name = "ReadOnlyVolume",
            Path = _tempDir,
            AccessMode = DatasetAccessMode.ReadOnly
        };
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            try { Directory.Delete(_tempDir, recursive: true); } catch { }
        }
    }

    [Fact]
    public async Task ListDirectoryAsync_Paginates100ItemsByDefault()
    {
        // Create 150 test files
        for (int i = 1; i <= 150; i++)
        {
            var fileName = $"file_{i:D3}.txt";
            File.WriteAllText(Path.Combine(_tempDir, fileName), $"content {i}");
        }

        var pagination = new PaginationParams
        {
            Page = 1,
            PageSize = 100,
            SortBy = SortField.Name,
            SortDirection = SortDirection.Ascending
        };

        var page1 = await _storageService.ListDirectoryAsync(_writableDataset, "", pagination);
        Assert.Equal(100, page1.Items.Count);
        Assert.Equal(150, page1.TotalItems);
        Assert.Equal(2, page1.TotalPages);
        Assert.True(page1.HasNextPage);
        Assert.False(page1.HasPreviousPage);

        pagination.Page = 2;
        var page2 = await _storageService.ListDirectoryAsync(_writableDataset, "", pagination);
        Assert.Equal(50, page2.Items.Count);
        Assert.False(page2.HasNextPage);
        Assert.True(page2.HasPreviousPage);
    }

    [Fact]
    public async Task ListDirectoryAsync_DirectoriesAlwaysAppearBeforeFiles()
    {
        // Create 200 files
        for (int i = 1; i <= 200; i++)
        {
            File.WriteAllText(Path.Combine(_tempDir, $"z_file_{i:D3}.txt"), $"content {i}");
        }

        // Create 5 subdirectories with names that would sort after 'z' alphabetically if not prioritized
        var dirNames = new[] { "alpha_dir", "beta_dir", "gamma_dir", "zeta_dir", "omega_dir" };
        foreach (var dir in dirNames)
        {
            Directory.CreateDirectory(Path.Combine(_tempDir, dir));
        }

        var pagination = new PaginationParams
        {
            Page = 1,
            PageSize = 50,
            SortBy = SortField.Name,
            SortDirection = SortDirection.Ascending
        };

        var page1 = await _storageService.ListDirectoryAsync(_writableDataset, "", pagination);

        // The first 5 items on page 1 MUST be the 5 subdirectories, ordered alphabetically
        Assert.True(page1.Items.Count == 50);
        for (int i = 0; i < 5; i++)
        {
            Assert.Equal(ItemType.Directory, page1.Items[i].Type);
        }
        Assert.Equal("alpha_dir", page1.Items[0].Name);
        Assert.Equal("beta_dir", page1.Items[1].Name);
        Assert.Equal("gamma_dir", page1.Items[2].Name);
        Assert.Equal("omega_dir", page1.Items[3].Name);
        Assert.Equal("zeta_dir", page1.Items[4].Name);

        // All remaining items on page 1 must be files
        for (int i = 5; i < 50; i++)
        {
            Assert.Equal(ItemType.File, page1.Items[i].Type);
        }

        // Test descending sort: directories still appear first, but sorted Z -> A
        pagination.SortDirection = SortDirection.Descending;
        var page1Desc = await _storageService.ListDirectoryAsync(_writableDataset, "", pagination);

        for (int i = 0; i < 5; i++)
        {
            Assert.Equal(ItemType.Directory, page1Desc.Items[i].Type);
        }
        Assert.Equal("zeta_dir", page1Desc.Items[0].Name);
        Assert.Equal("omega_dir", page1Desc.Items[1].Name);
        Assert.Equal("gamma_dir", page1Desc.Items[2].Name);
        Assert.Equal("beta_dir", page1Desc.Items[3].Name);
        Assert.Equal("alpha_dir", page1Desc.Items[4].Name);

        for (int i = 5; i < 50; i++)
        {
            Assert.Equal(ItemType.File, page1Desc.Items[i].Type);
        }
    }

    [Fact]
    public async Task ReadOnlyDataset_BlocksWriteOperations()
    {
        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        // Writing file
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _storageService.WriteFileAsync(_readOnlyDataset, "test.txt", stream));

        // Creating directory
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _storageService.CreateDirectoryAsync(_readOnlyDataset, "new_folder"));

        // Deleting item
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _storageService.DeleteItemAsync(_readOnlyDataset, "test.txt"));
    }

    [Fact]
    public async Task ReadTextContentAsync_ReadsFromSnapshot_WhenSnapshotNameProvided()
    {
        var relPath = "arquivo.txt";
        var liveFile = Path.Combine(_tempDir, relPath);
        File.WriteAllText(liveFile, "Live Current Content");

        var snapRoot = Path.Combine(_tempDir, ".zfs", "snapshot", "snap1");
        Directory.CreateDirectory(snapRoot);
        var snapFile = Path.Combine(snapRoot, relPath);
        File.WriteAllText(snapFile, "Historical Snapshot Content");

        // Without snapshot -> reads live version
        var currentText = await _storageService.ReadTextContentAsync(_writableDataset, relPath);
        Assert.Equal("Live Current Content", currentText);

        // With snapshot -> reads historical snapshot version
        var snapText = await _storageService.ReadTextContentAsync(_writableDataset, relPath, "snap1");
        Assert.Equal("Historical Snapshot Content", snapText);

        // With snapshot having @ prefix -> also resolves snapshot correctly
        var snapTextWithAt = await _storageService.ReadTextContentAsync(_writableDataset, relPath, "@snap1");
        Assert.Equal("Historical Snapshot Content", snapTextWithAt);
    }

    [Fact]
    public async Task ListDirectoryAsync_SortByDimensions_DisregardsSubdirectories_AndSortsByArea()
    {
        // 1. Create subdirectories in the directory
        Directory.CreateDirectory(Path.Combine(_tempDir, "subfolder_alpha"));
        Directory.CreateDirectory(Path.Combine(_tempDir, "subfolder_beta"));

        // 2. Create images with various dimensions:
        // img_small: 100 x 200 = 20,000 px
        // img_medium: 800 x 600 = 480,000 px
        // img_large: 1920 x 1080 = 2,073,600 px
        CreateTestPng(Path.Combine(_tempDir, "img_medium.png"), 800, 600);
        CreateTestPng(Path.Combine(_tempDir, "img_large.png"), 1920, 1080);
        CreateTestPng(Path.Combine(_tempDir, "img_small.png"), 100, 200);

        var paginationAsc = new PaginationParams
        {
            Page = 1,
            PageSize = 50,
            SortBy = SortField.Dimensions,
            SortDirection = SortDirection.Ascending
        };

        var resultAsc = await _storageService.ListDirectoryAsync(_writableDataset, "", paginationAsc);

        // Subdirectories must be disregarded!
        Assert.DoesNotContain(resultAsc.Items, x => x.Type == ItemType.Directory);
        Assert.Equal(3, resultAsc.Items.Count);

        // Ascending order: small (20k) -> medium (480k) -> large (2.07M)
        Assert.Equal("img_small.png", resultAsc.Items[0].Name);
        Assert.Equal(20000, resultAsc.Items[0].DimensionsArea);

        Assert.Equal("img_medium.png", resultAsc.Items[1].Name);
        Assert.Equal(480000, resultAsc.Items[1].DimensionsArea);

        Assert.Equal("img_large.png", resultAsc.Items[2].Name);
        Assert.Equal(2073600, resultAsc.Items[2].DimensionsArea);

        // Descending order: large -> medium -> small
        var paginationDesc = new PaginationParams
        {
            Page = 1,
            PageSize = 50,
            SortBy = SortField.Dimensions,
            SortDirection = SortDirection.Descending
        };

        var resultDesc = await _storageService.ListDirectoryAsync(_writableDataset, "", paginationDesc);

        Assert.DoesNotContain(resultDesc.Items, x => x.Type == ItemType.Directory);
        Assert.Equal(3, resultDesc.Items.Count);
        Assert.Equal("img_large.png", resultDesc.Items[0].Name);
        Assert.Equal("img_medium.png", resultDesc.Items[1].Name);
        Assert.Equal("img_small.png", resultDesc.Items[2].Name);
    }

    private static void CreateTestPng(string path, int width, int height)
    {
        using var bitmap = new SkiaSharp.SKBitmap(width, height);
        using var image = SkiaSharp.SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SkiaSharp.SKEncodedImageFormat.Png, 80);
        using var stream = File.OpenWrite(path);
        data.SaveTo(stream);
    }
}
