using System.Globalization;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Domain.ValueObjects;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Storage;

public class ZfsSnapshotService : ISnapshotService
{
    private readonly ILogger<ZfsSnapshotService> _logger;

    public ZfsSnapshotService(ILogger<ZfsSnapshotService> logger)
    {
        _logger = logger;
    }

    public Task<bool> HasSnapshotsAsync(DatasetConfig dataset, CancellationToken cancellationToken = default)
    {
        try
        {
            var snapRoot = GetSnapshotRoot(dataset.Path);
            return Task.FromResult(Directory.Exists(snapRoot));
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    public Task<IReadOnlyList<SnapshotInfo>> GetVersionsAsync(
        DatasetConfig dataset,
        string relativePath,
        bool onlyModified = true,
        CancellationToken cancellationToken = default)
    {
        var versions = new List<SnapshotInfo>();
        var snapRoot = GetSnapshotRoot(dataset.Path);

        if (!Directory.Exists(snapRoot))
        {
            return Task.FromResult<IReadOnlyList<SnapshotInfo>>(versions);
        }

        try
        {
            var cleanRelativePath = PathSecurityHelper.NormalizeRelativePath(relativePath);
            var snapshotDirs = Directory.GetDirectories(snapRoot);

            // Parse each snapshot directory and check for the item
            var rawList = new List<SnapshotInfo>();

            foreach (var snapDir in snapshotDirs)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var snapName = Path.GetFileName(snapDir);
                var itemSnapPath = string.IsNullOrEmpty(cleanRelativePath)
                    ? snapDir
                    : PathSecurityHelper.GetSafeFullPath(snapDir, cleanRelativePath);

                var timestamp = ParseSnapshotTimestamp(snapName, snapDir);

                if (File.Exists(itemSnapPath))
                {
                    var fileInfo = new FileInfo(itemSnapPath);
                    rawList.Add(new SnapshotInfo
                    {
                        SnapshotName = snapName,
                        Timestamp = timestamp,
                        RelativePath = cleanRelativePath,
                        SnapshotFullPath = itemSnapPath,
                        Type = ItemType.File,
                        Size = fileInfo.Length,
                        LastModifiedAtUtc = fileInfo.LastWriteTimeUtc,
                        ChangeStatus = SnapshotChangeStatus.Unchanged
                    });
                }
                else if (Directory.Exists(itemSnapPath))
                {
                    var dirInfo = new DirectoryInfo(itemSnapPath);
                    // For directories, calculate item count or quick signature
                    long dirSize = 0;
                    try
                    {
                        dirSize = dirInfo.EnumerateFileSystemInfos().Count();
                    }
                    catch
                    {
                        // Ignore permission/enumeration issues
                    }

                    rawList.Add(new SnapshotInfo
                    {
                        SnapshotName = snapName,
                        Timestamp = timestamp,
                        RelativePath = cleanRelativePath,
                        SnapshotFullPath = itemSnapPath,
                        Type = ItemType.Directory,
                        Size = dirSize,
                        LastModifiedAtUtc = dirInfo.LastWriteTimeUtc,
                        ChangeStatus = SnapshotChangeStatus.Unchanged
                    });
                }
            }

            // Order chronologically (oldest to newest) to detect changes across time
            var chronological = rawList.OrderBy(x => x.Timestamp).ToList();

            SnapshotInfo? previous = null;
            foreach (var item in chronological)
            {
                if (previous == null)
                {
                    // First recorded version is considered Modified / Added
                    item.ChangeStatus = SnapshotChangeStatus.Added;
                }
                else
                {
                    bool isChanged;
                    if (item.Type == ItemType.File)
                    {
                        // A file is modified if its size or last write time differs from previous snapshot
                        isChanged = item.Size != previous.Size ||
                                    Math.Abs((item.LastModifiedAtUtc - previous.LastModifiedAtUtc).TotalSeconds) > 2;
                    }
                    else
                    {
                        // A directory is modified if its child item count or modified time differs
                        isChanged = item.Size != previous.Size ||
                                    Math.Abs((item.LastModifiedAtUtc - previous.LastModifiedAtUtc).TotalSeconds) > 2;
                    }

                    item.ChangeStatus = isChanged ? SnapshotChangeStatus.Modified : SnapshotChangeStatus.Unchanged;
                }

                previous = item;
            }

            // Order newest first for user display
            var result = chronological.AsEnumerable().Reverse();

            if (onlyModified)
            {
                result = result.Where(x => x.ChangeStatus != SnapshotChangeStatus.Unchanged);
            }

            return Task.FromResult<IReadOnlyList<SnapshotInfo>>(result.ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading ZFS snapshots for {Dataset}/{Path}", dataset.Name, relativePath);
            return Task.FromResult<IReadOnlyList<SnapshotInfo>>(versions);
        }
    }

    public Task<(Stream Stream, string ContentType, string FileName)> OpenSnapshotReadAsync(
        DatasetConfig dataset,
        string relativePath,
        string snapshotName,
        CancellationToken cancellationToken = default)
    {
        var snapRoot = GetSnapshotRoot(dataset.Path);
        var cleanSnap = snapshotName.TrimStart('@');
        var snapDir = Path.Combine(snapRoot, cleanSnap);

        if (!Directory.Exists(snapDir))
        {
            var altDir = Path.Combine(snapRoot, "@" + cleanSnap);
            if (Directory.Exists(altDir))
            {
                snapDir = altDir;
            }
            else
            {
                throw new DirectoryNotFoundException($"Snapshot '{snapshotName}' not found.");
            }
        }

        var cleanRelPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var targetPath = PathSecurityHelper.GetSafeFullPath(snapDir, cleanRelPath);

        if (!File.Exists(targetPath))
        {
            throw new FileNotFoundException($"File not found in snapshot '{snapshotName}'.", cleanRelPath);
        }

        var stream = new FileStream(targetPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var fileName = Path.GetFileName(targetPath);
        var ext = Path.GetExtension(targetPath).ToLowerInvariant();
        var contentType = GetMimeType(ext);

        return Task.FromResult((Stream: (Stream)stream, ContentType: contentType, FileName: fileName));
    }

    private static string GetSnapshotRoot(string datasetPath)
    {
        return Path.Combine(datasetPath, ".zfs", "snapshot");
    }

    private static DateTime ParseSnapshotTimestamp(string snapName, string snapDir)
    {
        // TrueNAS format: auto-YYYY-MM-DD_HH-mm or YYYY-MM-DD_HH-mm or manual-timestamp
        // Try parsing dates from snapshot name
        string[] formats = {
            "yyyy-MM-dd_HH-mm",
            "yyyyMMdd-HHmmss",
            "yyyy-MM-dd-HHmm",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-dd"
        };

        foreach (var format in formats)
        {
            // Extract substrings matching length of format
            for (int i = 0; i <= snapName.Length - format.Length; i++)
            {
                var candidate = snapName.Substring(i, format.Length);
                if (DateTime.TryParseExact(candidate, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                {
                    return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                }
            }
        }

        // Fallback: directory creation time or last write time
        try
        {
            var dirInfo = new DirectoryInfo(snapDir);
            return dirInfo.CreationTimeUtc != DateTime.MinValue ? dirInfo.CreationTimeUtc : dirInfo.LastWriteTimeUtc;
        }
        catch
        {
            return DateTime.UtcNow;
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
