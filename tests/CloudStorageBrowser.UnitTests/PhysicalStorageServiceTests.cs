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
}
