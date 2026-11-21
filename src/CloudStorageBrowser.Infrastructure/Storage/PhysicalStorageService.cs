using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.Common.Models;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Storage;

public class PhysicalStorageService : IStorageService
{
    private readonly ISnapshotService _snapshotService;
    private readonly ILogger<PhysicalStorageService> _logger;

    public PhysicalStorageService(
        ISnapshotService snapshotService,
        ILogger<PhysicalStorageService> logger)
    {
        _snapshotService = snapshotService;
        _logger = logger;
    }

    public async Task<PagedResult<StorageItem>> ListDirectoryAsync(
        DatasetConfig dataset,
        string relativePath,
        PaginationParams pagination,
        string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var basePath = GetEffectiveBasePath(dataset, snapshotName);
        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var dirFullPath = string.IsNullOrEmpty(cleanRelPath)
            ? basePath
            : PathSecurityHelper.GetSafeFullPath(basePath, cleanRelPath);

        if (!Directory.Exists(dirFullPath))
        {
            throw new DirectoryNotFoundException($"Directory '{cleanRelPath}' does not exist in dataset '{dataset.Name}'.");
        }

        var dirInfo = new DirectoryInfo(dirFullPath);
        var isReadOnly = dataset.AccessMode == DatasetAccessMode.ReadOnly || !string.IsNullOrEmpty(snapshotName);
        var hasShadowCopy = await _snapshotService.HasSnapshotsAsync(dataset, cancellationToken);

        var items = new List<StorageItem>();

        // Enumerate directories
        foreach (var subDir in dirInfo.EnumerateDirectories())
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Hide the .zfs system directory from regular listings
            if (subDir.Name.Equals(".zfs", StringComparison.OrdinalIgnoreCase))
                continue;

            // Search filter
            if (!string.IsNullOrWhiteSpace(pagination.Search) &&
                !subDir.Name.Contains(pagination.Search, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var itemRelPath = string.IsNullOrEmpty(cleanRelPath)
                ? subDir.Name
                : $"{cleanRelPath}/{subDir.Name}";

            items.Add(new StorageItem
            {
                Name = subDir.Name,
                RelativePath = itemRelPath,
                FullPath = subDir.FullName,
                Type = ItemType.Directory,
                Size = 0,
                CreatedAtUtc = subDir.CreationTimeUtc,
                LastModifiedAtUtc = subDir.LastWriteTimeUtc,
                Extension = string.Empty,
                Category = FileCategory.Other,
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy
            });
        }

        // Enumerate files
        foreach (var file in dirInfo.EnumerateFiles())
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!string.IsNullOrWhiteSpace(pagination.Search) &&
                !file.Name.Contains(pagination.Search, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var itemRelPath = string.IsNullOrEmpty(cleanRelPath)
                ? file.Name
                : $"{cleanRelPath}/{file.Name}";

            var ext = file.Extension.ToLowerInvariant();

            items.Add(new StorageItem
            {
                Name = file.Name,
                RelativePath = itemRelPath,
                FullPath = file.FullName,
                Type = ItemType.File,
                Size = file.Length,
                CreatedAtUtc = file.CreationTimeUtc,
                LastModifiedAtUtc = file.LastWriteTimeUtc,
                Extension = ext,
                Category = FileCategoryHelper.GetCategory(ext),
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy
            });
        }

        // Sorting: Directories always appear before files
        IOrderedEnumerable<StorageItem> sorted;
        bool isAsc = pagination.SortDirection == SortDirection.Ascending;

        sorted = pagination.SortBy switch
        {
            SortField.Size => isAsc
                ? items.OrderBy(x => x.Type).ThenBy(x => x.Size).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type).ThenByDescending(x => x.Size).ThenBy(x => x.Name),
            SortField.LastModified => isAsc
                ? items.OrderBy(x => x.Type).ThenBy(x => x.LastModifiedAtUtc).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type).ThenByDescending(x => x.LastModifiedAtUtc).ThenBy(x => x.Name),
            SortField.Extension => isAsc
                ? items.OrderBy(x => x.Type).ThenBy(x => x.Extension).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type).ThenByDescending(x => x.Extension).ThenBy(x => x.Name),
            _ => isAsc
                ? items.OrderBy(x => x.Type).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type).ThenByDescending(x => x.Name)
        };

        var allSorted = sorted.ToList();
        var totalItems = allSorted.Count;

        // Apply pagination
        var pagedItems = allSorted
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToList();

        return new PagedResult<StorageItem>
        {
            Items = pagedItems,
            Page = pagination.Page,
            PageSize = pagination.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<StorageItem?> GetItemAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var basePath = GetEffectiveBasePath(dataset, snapshotName);
        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = string.IsNullOrEmpty(cleanRelPath)
            ? basePath
            : PathSecurityHelper.GetSafeFullPath(basePath, cleanRelPath);

        var isReadOnly = dataset.AccessMode == DatasetAccessMode.ReadOnly || !string.IsNullOrEmpty(snapshotName);
        var hasShadowCopy = await _snapshotService.HasSnapshotsAsync(dataset, cancellationToken);

        if (File.Exists(fullPath))
        {
            var file = new FileInfo(fullPath);
            var ext = file.Extension.ToLowerInvariant();
            return new StorageItem
            {
                Name = file.Name,
                RelativePath = cleanRelPath,
                FullPath = file.FullName,
                Type = ItemType.File,
                Size = file.Length,
                CreatedAtUtc = file.CreationTimeUtc,
                LastModifiedAtUtc = file.LastWriteTimeUtc,
                Extension = ext,
                Category = FileCategoryHelper.GetCategory(ext),
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy
            };
        }

        if (Directory.Exists(fullPath))
        {
            var dir = new DirectoryInfo(fullPath);
            return new StorageItem
            {
                Name = dir.Name,
                RelativePath = cleanRelPath,
                FullPath = dir.FullName,
                Type = ItemType.Directory,
                Size = 0,
                CreatedAtUtc = dir.CreationTimeUtc,
                LastModifiedAtUtc = dir.LastWriteTimeUtc,
                Extension = string.Empty,
                Category = FileCategory.Other,
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy
            };
        }

        return null;
    }

    public Task<(Stream Stream, string ContentType, string FileName)> OpenReadAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var basePath = GetEffectiveBasePath(dataset, snapshotName);
        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(basePath, cleanRelPath);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"File '{cleanRelPath}' was not found.", cleanRelPath);
        }

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var fileName = Path.GetFileName(fullPath);
        var ext = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = GetMimeType(ext);

        return Task.FromResult((Stream: (Stream)stream, ContentType: contentType, FileName: fileName));
    }

    public async Task WriteFileAsync(
        DatasetConfig dataset,
        string relativePath,
        Stream contentStream,
        bool overwrite = true,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        var parentDir = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrEmpty(parentDir) && !Directory.Exists(parentDir))
        {
            Directory.CreateDirectory(parentDir);
        }

        if (!overwrite && File.Exists(fullPath))
        {
            throw new InvalidOperationException($"File '{cleanRelPath}' already exists.");
        }

        await using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await contentStream.CopyToAsync(fileStream, cancellationToken);
    }

    public Task CreateDirectoryAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        if (Directory.Exists(fullPath))
        {
            return Task.CompletedTask;
        }

        Directory.CreateDirectory(fullPath);
        return Task.CompletedTask;
    }

    public Task DeleteItemAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        else if (Directory.Exists(fullPath))
        {
            Directory.Delete(fullPath, recursive: true);
        }

        return Task.CompletedTask;
    }

    public Task RenameItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string newName,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanSourceRel = PathSecurityHelper.NormalizeRelativePath(sourceRelativePath);
        var sourceFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanSourceRel);

        var parentDir = Path.GetDirectoryName(sourceFullPath) ?? dataset.Path;
        var targetFullPath = Path.Combine(parentDir, newName);

        // Ensure target is still within safe boundary
        targetFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, Path.GetRelativePath(dataset.Path, targetFullPath));

        if (File.Exists(sourceFullPath))
        {
            File.Move(sourceFullPath, targetFullPath);
        }
        else if (Directory.Exists(sourceFullPath))
        {
            Directory.Move(sourceFullPath, targetFullPath);
        }
        else
        {
            throw new FileNotFoundException($"Item '{cleanSourceRel}' was not found.");
        }

        return Task.CompletedTask;
    }

    public Task MoveItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanSource = PathSecurityHelper.NormalizeRelativePath(sourceRelativePath);
        var cleanTarget = PathSecurityHelper.NormalizeRelativePath(targetRelativePath);

        var sourceFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanSource);
        var targetFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanTarget);

        var targetParent = Path.GetDirectoryName(targetFullPath);
        if (!string.IsNullOrEmpty(targetParent) && !Directory.Exists(targetParent))
        {
            Directory.CreateDirectory(targetParent);
        }

        if (File.Exists(sourceFullPath))
        {
            File.Move(sourceFullPath, targetFullPath, overwrite: true);
        }
        else if (Directory.Exists(sourceFullPath))
        {
            Directory.Move(sourceFullPath, targetFullPath);
        }
        else
        {
            throw new FileNotFoundException($"Source '{cleanSource}' not found.");
        }

        return Task.CompletedTask;
    }

    public async Task CopyItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanSource = PathSecurityHelper.NormalizeRelativePath(sourceRelativePath);
        var cleanTarget = PathSecurityHelper.NormalizeRelativePath(targetRelativePath);

        var sourceFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanSource);
        var targetFullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanTarget);

        if (File.Exists(sourceFullPath))
        {
            var targetParent = Path.GetDirectoryName(targetFullPath);
            if (!string.IsNullOrEmpty(targetParent) && !Directory.Exists(targetParent))
            {
                Directory.CreateDirectory(targetParent);
            }

            File.Copy(sourceFullPath, targetFullPath, overwrite: true);
        }
        else if (Directory.Exists(sourceFullPath))
        {
            CopyDirectoryRecursive(sourceFullPath, targetFullPath);
        }
        else
        {
            throw new FileNotFoundException($"Source '{cleanSource}' not found.");
        }

        await Task.CompletedTask;
    }

    public async Task<string> ReadTextContentAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default)
    {
        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"File '{cleanRelPath}' was not found.");
        }

        return await File.ReadAllTextAsync(fullPath, cancellationToken);
    }

    public async Task SaveTextContentAsync(
        DatasetConfig dataset,
        string relativePath,
        string content,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        await File.WriteAllTextAsync(fullPath, content, cancellationToken);
    }

    public Task<DiskUsageInfo> GetDiskUsageAsync(DatasetConfig dataset, CancellationToken cancellationToken = default)
    {
        try
        {
            var drive = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(dataset.Path)) ?? dataset.Path);
            return Task.FromResult(new DiskUsageInfo
            {
                TotalBytes = drive.TotalSize,
                FreeBytes = drive.AvailableFreeSpace
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not determine drive info for {Path}", dataset.Path);
            return Task.FromResult(new DiskUsageInfo
            {
                TotalBytes = 0,
                FreeBytes = 0
            });
        }
    }

    private static string GetEffectiveBasePath(DatasetConfig dataset, string? snapshotName)
    {
        if (string.IsNullOrEmpty(snapshotName))
        {
            return dataset.Path;
        }

        var snapPath = Path.Combine(dataset.Path, ".zfs", "snapshot", snapshotName);
        if (!Directory.Exists(snapPath))
        {
            throw new DirectoryNotFoundException($"Snapshot '{snapshotName}' not found.");
        }

        return snapPath;
    }

    private static void EnsureWritable(DatasetConfig dataset)
    {
        if (dataset.AccessMode == DatasetAccessMode.ReadOnly)
        {
            throw new InvalidOperationException($"Dataset '{dataset.Name}' is configured as Read-Only (:ro). Write operations are forbidden.");
        }
    }

    private static void CopyDirectoryRecursive(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var dest = Path.Combine(targetDir, Path.GetFileName(file));
            File.Copy(file, dest, overwrite: true);
        }

        foreach (var sub in Directory.GetDirectories(sourceDir))
        {
            var dest = Path.Combine(targetDir, Path.GetFileName(sub));
            CopyDirectoryRecursive(sub, dest);
        }
    }

    private static string GetMimeType(string extension) => extension switch
    {
        ".pdf" => "application/pdf",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".svg" => "image/svg+xml",
        ".mp4" => "video/mp4",
        ".webm" => "video/webm",
        ".mkv" => "video/x-matroska",
        ".mov" => "video/quicktime",
        ".mp3" => "audio/mpeg",
        ".wav" => "audio/wav",
        ".ogg" => "audio/ogg",
        ".json" => "application/json",
        ".xml" => "application/xml",
        ".txt" => "text/plain",
        ".csv" => "text/csv",
        ".html" => "text/html",
        _ => "application/octet-stream"
    };
}
