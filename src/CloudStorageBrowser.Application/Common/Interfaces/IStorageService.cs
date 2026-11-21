using CloudStorageBrowser.Application.Common.Models;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.ValueObjects;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IStorageService
{
    Task<PagedResult<StorageItem>> ListDirectoryAsync(
        DatasetConfig dataset,
        string relativePath,
        PaginationParams pagination,
        string? snapshotName = null,
        CancellationToken cancellationToken = default);

    Task<StorageItem?> GetItemAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)> OpenReadAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default);

    Task WriteFileAsync(
        DatasetConfig dataset,
        string relativePath,
        Stream contentStream,
        bool overwrite = true,
        CancellationToken cancellationToken = default);

    Task CreateDirectoryAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default);

    Task DeleteItemAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default);

    Task RenameItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string newName,
        CancellationToken cancellationToken = default);

    Task MoveItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default);

    Task CopyItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default);

    Task<string> ReadTextContentAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default);

    Task SaveTextContentAsync(
        DatasetConfig dataset,
        string relativePath,
        string content,
        CancellationToken cancellationToken = default);

    Task<DiskUsageInfo> GetDiskUsageAsync(
        DatasetConfig dataset,
        CancellationToken cancellationToken = default);
}
