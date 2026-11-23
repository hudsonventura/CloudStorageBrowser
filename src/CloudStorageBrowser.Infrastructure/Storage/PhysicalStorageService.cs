using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.Common.Models;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using SkiaSharp;
using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using MetadataExtractor.Formats.Jpeg;
using MetadataExtractor.Formats.Png;
using Directory = System.IO.Directory;

namespace CloudStorageBrowser.Infrastructure.Storage;

public class PhysicalStorageService : IStorageService
{
    private readonly ISnapshotService _snapshotService;
    private readonly ILogger<PhysicalStorageService> _logger;
    private readonly IFolderStatsService? _folderStatsService;

    public PhysicalStorageService(
        ISnapshotService snapshotService,
        ILogger<PhysicalStorageService> logger,
        IFolderStatsService? folderStatsService = null)
    {
        _snapshotService = snapshotService;
        _logger = logger;
        _folderStatsService = folderStatsService;
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

        // Enumerate directories (disregarded when sorting by Dimensions)
        if (pagination.SortBy != SortField.Dimensions)
        {
            foreach (var subDir in dirInfo.EnumerateDirectories())
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Hide the .zfs system directory from regular listings
                if (subDir.Name.Equals(".zfs", StringComparison.OrdinalIgnoreCase))
                    continue;

                // Hide hidden directories starting with '.' unless ShowHidden is true
                if (!pagination.ShowHidden && subDir.Name.StartsWith('.'))
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

                long dirSize = 0;
                int? subitemsCount = null;
                int? filesCount = null;
                int? dirsCount = null;
                bool isCalculating = false;

                if (_folderStatsService != null)
                {
                    var stats = await _folderStatsService.GetFolderStatsAsync(
                        dataset.Id, itemRelPath, snapshotName, queueIfMissing: true, cancellationToken);

                    if (stats != null)
                    {
                        dirSize = stats.TotalBytes;
                        subitemsCount = stats.TotalSubitemsCount;
                        filesCount = stats.FilesCount;
                        dirsCount = stats.DirectoriesCount;
                        isCalculating = stats.IsCalculating;
                    }
                }

                items.Add(new StorageItem
                {
                    Name = subDir.Name,
                    RelativePath = itemRelPath,
                    FullPath = subDir.FullName,
                    Type = ItemType.Directory,
                    Size = dirSize,
                    SubitemsCount = subitemsCount,
                    FilesCount = filesCount,
                    DirectoriesCount = dirsCount,
                    IsCalculatingStats = isCalculating,
                    CreatedAtUtc = subDir.CreationTimeUtc,
                    LastModifiedAtUtc = subDir.LastWriteTimeUtc,
                    Extension = string.Empty,
                    Category = FileCategory.Other,
                    IsReadOnly = isReadOnly,
                    HasShadowCopy = hasShadowCopy
                });
            }
        }

        // Enumerate files
        foreach (var file in dirInfo.EnumerateFiles())
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Hide hidden files starting with '.' unless ShowHidden is true
            if (!pagination.ShowHidden && file.Name.StartsWith('.'))
                continue;

            if (!string.IsNullOrWhiteSpace(pagination.Search) &&
                !file.Name.Contains(pagination.Search, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var itemRelPath = string.IsNullOrEmpty(cleanRelPath)
                ? file.Name
                : $"{cleanRelPath}/{file.Name}";

            var ext = file.Extension.ToLowerInvariant();
            var category = FileCategoryHelper.GetCategory(ext);

            int? width = null;
            int? height = null;
            if (pagination.SortBy == SortField.Dimensions &&
                (category == FileCategory.Image || category == FileCategory.Video))
            {
                (width, height) = GetMediaDimensions(file.FullName, category, ext);
            }

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
                Category = category,
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy,
                Width = width,
                Height = height
            });
        }

        // Sorting: Directories always appear before files
        IOrderedEnumerable<StorageItem> sorted;
        bool isAsc = pagination.SortDirection == SortDirection.Ascending;

        sorted = pagination.SortBy switch
        {
            SortField.Size => isAsc
                ? items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenBy(x => x.Size).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenByDescending(x => x.Size).ThenBy(x => x.Name),
            SortField.LastModified => isAsc
                ? items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenBy(x => x.LastModifiedAtUtc).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenByDescending(x => x.LastModifiedAtUtc).ThenBy(x => x.Name),
            SortField.Extension => isAsc
                ? items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenBy(x => x.Extension).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenByDescending(x => x.Extension).ThenBy(x => x.Name),
            SortField.Dimensions => isAsc
                ? items.OrderBy(x => x.DimensionsArea ?? 0).ThenBy(x => x.Name)
                : items.OrderByDescending(x => x.DimensionsArea ?? 0).ThenBy(x => x.Name),
            _ => isAsc
                ? items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenBy(x => x.Name)
                : items.OrderBy(x => x.Type == ItemType.Directory ? 0 : 1).ThenByDescending(x => x.Name)
        };

        var allSorted = sorted.ToList();
        var totalItems = allSorted.Count;

        // Apply pagination
        var pagedItems = allSorted
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToList();

        // Populate dimensions for current page items if not already populated
        foreach (var item in pagedItems)
        {
            if (item.Type == ItemType.File && !item.Width.HasValue &&
                (item.Category == FileCategory.Image || item.Category == FileCategory.Video))
            {
                var (w, h) = GetMediaDimensions(item.FullPath, item.Category, item.Extension);
                item.Width = w;
                item.Height = h;
            }
        }

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
            var category = FileCategoryHelper.GetCategory(ext);
            var (w, h) = (category == FileCategory.Image || category == FileCategory.Video)
                ? GetMediaDimensions(fullPath, category, ext)
                : (null, null);

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
                Category = category,
                IsReadOnly = isReadOnly,
                HasShadowCopy = hasShadowCopy,
                Width = w,
                Height = h
            };
        }

        if (Directory.Exists(fullPath))
        {
            var dir = new DirectoryInfo(fullPath);

            long dirSize = 0;
            int? subitemsCount = null;
            int? filesCount = null;
            int? dirsCount = null;
            bool isCalculating = false;

            if (_folderStatsService != null)
            {
                var stats = await _folderStatsService.GetFolderStatsAsync(
                    dataset.Id, cleanRelPath, snapshotName, queueIfMissing: true, cancellationToken);

                if (stats != null)
                {
                    dirSize = stats.TotalBytes;
                    subitemsCount = stats.TotalSubitemsCount;
                    filesCount = stats.FilesCount;
                    dirsCount = stats.DirectoriesCount;
                    isCalculating = stats.IsCalculating;
                }
            }

            return new StorageItem
            {
                Name = dir.Name,
                RelativePath = cleanRelPath,
                FullPath = dir.FullName,
                Type = ItemType.Directory,
                Size = dirSize,
                SubitemsCount = subitemsCount,
                FilesCount = filesCount,
                DirectoriesCount = dirsCount,
                IsCalculatingStats = isCalculating,
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

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanRelPath, cancellationToken);
        }
    }

    public async Task CreateDirectoryAsync(
        DatasetConfig dataset,
        string relativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(dataset);

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var fullPath = PathSecurityHelper.GetSafeFullPath(dataset.Path, cleanRelPath);

        if (Directory.Exists(fullPath))
        {
            return;
        }

        Directory.CreateDirectory(fullPath);

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanRelPath, cancellationToken);
        }
    }

    public async Task DeleteItemAsync(
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

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanRelPath, cancellationToken);
        }
    }

    public async Task RenameItemAsync(
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

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanSourceRel, cancellationToken);
            var cleanTargetRel = Path.GetRelativePath(dataset.Path, targetFullPath).Replace('\\', '/');
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanTargetRel, cancellationToken);
        }
    }

    public Task MoveItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        return MoveItemAsync(dataset, sourceRelativePath, dataset, targetRelativePath, cancellationToken);
    }

    public async Task MoveItemAsync(
        DatasetConfig sourceDataset,
        string sourceRelativePath,
        DatasetConfig targetDataset,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(sourceDataset);
        EnsureWritable(targetDataset);

        var cleanSource = PathSecurityHelper.NormalizeRelativePath(sourceRelativePath);
        var cleanTarget = PathSecurityHelper.NormalizeRelativePath(targetRelativePath);

        var sourceFullPath = PathSecurityHelper.GetSafeFullPath(sourceDataset.Path, cleanSource);
        var targetFullPath = PathSecurityHelper.GetSafeFullPath(targetDataset.Path, cleanTarget);

        var targetParent = Path.GetDirectoryName(targetFullPath);
        if (!string.IsNullOrEmpty(targetParent) && !Directory.Exists(targetParent))
        {
            Directory.CreateDirectory(targetParent);
        }

        if (File.Exists(sourceFullPath))
        {
            if (string.Equals(sourceDataset.Path, targetDataset.Path, StringComparison.OrdinalIgnoreCase))
            {
                File.Move(sourceFullPath, targetFullPath, overwrite: true);
            }
            else
            {
                File.Copy(sourceFullPath, targetFullPath, overwrite: true);
                File.Delete(sourceFullPath);
            }
        }
        else if (Directory.Exists(sourceFullPath))
        {
            if (string.Equals(sourceDataset.Path, targetDataset.Path, StringComparison.OrdinalIgnoreCase))
            {
                Directory.Move(sourceFullPath, targetFullPath);
            }
            else
            {
                CopyDirectoryRecursive(sourceFullPath, targetFullPath);
                Directory.Delete(sourceFullPath, recursive: true);
            }
        }
        else
        {
            throw new FileNotFoundException($"Source '{cleanSource}' not found.");
        }

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(sourceDataset.Id, cleanSource, cancellationToken);
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(targetDataset.Id, cleanTarget, cancellationToken);
        }
    }

    public Task CopyItemAsync(
        DatasetConfig dataset,
        string sourceRelativePath,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        return CopyItemAsync(dataset, sourceRelativePath, dataset, targetRelativePath, cancellationToken);
    }

    public async Task CopyItemAsync(
        DatasetConfig sourceDataset,
        string sourceRelativePath,
        DatasetConfig targetDataset,
        string targetRelativePath,
        CancellationToken cancellationToken = default)
    {
        EnsureWritable(targetDataset);

        var cleanSource = PathSecurityHelper.NormalizeRelativePath(sourceRelativePath);
        var cleanTarget = PathSecurityHelper.NormalizeRelativePath(targetRelativePath);

        var sourceFullPath = PathSecurityHelper.GetSafeFullPath(sourceDataset.Path, cleanSource);
        var targetFullPath = PathSecurityHelper.GetSafeFullPath(targetDataset.Path, cleanTarget);

        var targetParent = Path.GetDirectoryName(targetFullPath);
        if (!string.IsNullOrEmpty(targetParent) && !Directory.Exists(targetParent))
        {
            Directory.CreateDirectory(targetParent);
        }

        if (File.Exists(sourceFullPath))
        {
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

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(targetDataset.Id, cleanTarget, cancellationToken);
        }
    }

    public async Task<string> ReadTextContentAsync(
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
            throw new FileNotFoundException($"File '{cleanRelPath}' was not found in snapshot '{snapshotName ?? "current"}'.");
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

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, cleanRelPath, cancellationToken);
        }
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

        var cleanSnap = snapshotName.TrimStart('@');
        var snapPath = Path.Combine(dataset.Path, ".zfs", "snapshot", cleanSnap);
        if (!Directory.Exists(snapPath))
        {
            var altPath = Path.Combine(dataset.Path, ".zfs", "snapshot", "@" + cleanSnap);
            if (Directory.Exists(altPath))
            {
                return altPath;
            }
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

    private static (int? Width, int? Height) GetMediaDimensions(string fullPath, FileCategory category, string ext)
    {
        if (category == FileCategory.Image)
        {
            // 1. SVG
            if (ext == ".svg")
            {
                try
                {
                    using var fs = File.OpenRead(fullPath);
                    using var reader = new StreamReader(fs);
                    var buffer = new char[4096];
                    var read = reader.Read(buffer, 0, buffer.Length);
                    var head = new string(buffer, 0, read);

                    var widthMatch = Regex.Match(head, @"width=[""']([\d\.]+)(?:px)?[""']", RegexOptions.IgnoreCase);
                    var heightMatch = Regex.Match(head, @"height=[""']([\d\.]+)(?:px)?[""']", RegexOptions.IgnoreCase);
                    if (widthMatch.Success && heightMatch.Success)
                    {
                        if (double.TryParse(widthMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var w) &&
                            double.TryParse(heightMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var h))
                        {
                            return ((int)Math.Round(w), (int)Math.Round(h));
                        }
                    }

                    var viewBoxMatch = Regex.Match(head, @"viewBox=[""'][\d\.\s-]+[\s,]+[\d\.\s-]+[\s,]+([\d\.]+)[\s,]+([\d\.]+)[""']", RegexOptions.IgnoreCase);
                    if (viewBoxMatch.Success)
                    {
                        if (double.TryParse(viewBoxMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var vw) &&
                            double.TryParse(viewBoxMatch.Groups[2].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var vh))
                        {
                            return ((int)Math.Round(vw), (int)Math.Round(vh));
                        }
                    }
                }
                catch { }
                return (null, null);
            }

            // 2. Fast inspection via SkiaSharp SKCodec
            try
            {
                using var stream = File.OpenRead(fullPath);
                using var codec = SKCodec.Create(stream);
                if (codec != null && codec.Info.Width > 0 && codec.Info.Height > 0)
                {
                    return (codec.Info.Width, codec.Info.Height);
                }
            }
            catch { }

            // 3. Fallback: MetadataExtractor
            try
            {
                var directories = MetadataExtractor.ImageMetadataReader.ReadMetadata(fullPath);
                foreach (var dir in directories)
                {
                    int? w = null;
                    int? h = null;

                    if (dir.TryGetInt32(MetadataExtractor.Formats.Png.PngDirectory.TagImageWidth, out var pw)) w = pw;
                    if (dir.TryGetInt32(MetadataExtractor.Formats.Png.PngDirectory.TagImageHeight, out var ph)) h = ph;

                    if (!w.HasValue && dir.TryGetInt32(MetadataExtractor.Formats.Jpeg.JpegDirectory.TagImageWidth, out var jw)) w = jw;
                    if (!h.HasValue && dir.TryGetInt32(MetadataExtractor.Formats.Jpeg.JpegDirectory.TagImageHeight, out var jh)) h = jh;

                    if (!w.HasValue && dir.TryGetInt32(MetadataExtractor.Formats.Exif.ExifDirectoryBase.TagExifImageWidth, out var ew)) w = ew;
                    if (!h.HasValue && dir.TryGetInt32(MetadataExtractor.Formats.Exif.ExifDirectoryBase.TagExifImageHeight, out var eh)) h = eh;

                    if (w.HasValue && h.HasValue && w > 0 && h > 0)
                    {
                        return (w, h);
                    }
                }
            }
            catch { }
        }
        else if (category == FileCategory.Video)
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "ffprobe",
                    Arguments = $"-v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 \"{fullPath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    if (process.WaitForExit(1000))
                    {
                        var output = process.StandardOutput.ReadToEnd().Trim();
                        var parts = output.Split('x');
                        if (parts.Length == 2 &&
                            int.TryParse(parts[0], out var vw) &&
                            int.TryParse(parts[1], out var vh))
                        {
                            return (vw, vh);
                        }
                    }
                    else
                    {
                        try { process.Kill(); } catch { }
                    }
                }
            }
            catch { }
        }

        return (null, null);
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
