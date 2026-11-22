using System.Collections.Concurrent;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Services;

public class FolderStatsService : IFolderStatsService
{
    private readonly FolderStatsChannel _channel;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FolderStatsService> _logger;
    private readonly ConcurrentDictionary<string, FolderStatsDto> _cache = new(StringComparer.OrdinalIgnoreCase);
    private bool _initialized = false;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    public FolderStatsService(
        FolderStatsChannel channel,
        IServiceScopeFactory scopeFactory,
        ILogger<FolderStatsService> logger)
    {
        _channel = channel;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    private async Task EnsureInitializedAsync(CancellationToken cancellationToken = default)
    {
        if (_initialized) return;

        await _initLock.WaitAsync(cancellationToken);
        try
        {
            if (_initialized) return;

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var existing = await db.FolderStatsCaches
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            foreach (var item in existing)
            {
                var snap = string.IsNullOrEmpty(item.SnapshotName) ? null : item.SnapshotName;
                var key = GetCacheKey(item.DatasetId, item.RelativePath, snap);
                _cache[key] = new FolderStatsDto
                {
                    DatasetId = item.DatasetId,
                    RelativePath = item.RelativePath,
                    SnapshotName = snap,
                    TotalBytes = item.TotalBytes,
                    FilesCount = item.FilesCount,
                    DirectoriesCount = item.DirectoriesCount,
                    TotalSubitemsCount = item.TotalSubitemsCount,
                    CalculatedAtUtc = item.CalculatedAtUtc,
                    IsCalculating = item.IsStale,
                    IsStale = item.IsStale
                };
            }

            _initialized = true;
            _logger.LogInformation("Loaded {Count} cached folder stats into memory.", existing.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not pre-load folder stats cache from database.");
            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    public async Task<FolderStatsDto?> GetFolderStatsAsync(
        int datasetId,
        string relativePath,
        string? snapshotName = null,
        bool queueIfMissing = true,
        CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);

        var normPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var key = GetCacheKey(datasetId, normPath, snapshotName);

        if (_cache.TryGetValue(key, out var cached))
        {
            if (cached.IsStale && queueIfMissing)
            {
                QueueCalculation(datasetId, normPath, snapshotName, force: true);
            }
            return cached;
        }

        if (queueIfMissing)
        {
            var pending = new FolderStatsDto
            {
                DatasetId = datasetId,
                RelativePath = normPath,
                SnapshotName = snapshotName,
                TotalBytes = 0,
                FilesCount = 0,
                DirectoriesCount = 0,
                TotalSubitemsCount = 0,
                IsCalculating = true,
                IsStale = false
            };
            _cache[key] = pending;

            QueueCalculation(datasetId, normPath, snapshotName);
            return pending;
        }

        return null;
    }

    public async Task<Dictionary<string, FolderStatsDto>> GetBatchFolderStatsAsync(
        int datasetId,
        IEnumerable<string> relativePaths,
        string? snapshotName = null,
        bool queueIfMissing = true,
        CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);

        var result = new Dictionary<string, FolderStatsDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var rawPath in relativePaths)
        {
            var normPath = PathSecurityHelper.NormalizeRelativePath(rawPath);
            var stats = await GetFolderStatsAsync(datasetId, normPath, snapshotName, queueIfMissing, cancellationToken);
            if (stats != null)
            {
                result[rawPath] = stats;
            }
        }

        return result;
    }

    public void QueueCalculation(int datasetId, string relativePath, string? snapshotName = null, bool force = false)
    {
        var normPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var key = GetCacheKey(datasetId, normPath, snapshotName);

        if (!_cache.ContainsKey(key))
        {
            _cache[key] = new FolderStatsDto
            {
                DatasetId = datasetId,
                RelativePath = normPath,
                SnapshotName = snapshotName,
                IsCalculating = true
            };
        }
        else if (force)
        {
            _cache[key].IsCalculating = true;
        }

        _channel.TryEnqueue(new FolderCalculationTask(datasetId, normPath, snapshotName, force));
    }

    public void QueueCalculations(int datasetId, IEnumerable<string> relativePaths, string? snapshotName = null, bool force = false)
    {
        foreach (var path in relativePaths)
        {
            QueueCalculation(datasetId, path, snapshotName, force);
        }
    }

    public async Task InvalidateAndRecalculateAncestorsAsync(
        int datasetId,
        string relativePath,
        CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);

        var ancestors = GetAncestorPaths(relativePath);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

        foreach (var ancestor in ancestors)
        {
            var key = GetCacheKey(datasetId, ancestor, null);
            if (_cache.TryGetValue(key, out var cached))
            {
                cached.IsStale = true;
                cached.IsCalculating = true;
            }
            else
            {
                _cache[key] = new FolderStatsDto
                {
                    DatasetId = datasetId,
                    RelativePath = ancestor,
                    IsCalculating = true,
                    IsStale = true
                };
            }

            // Mark stale in DB
            var dbEntry = await db.FolderStatsCaches
                .FirstOrDefaultAsync(x => x.DatasetId == datasetId && x.SnapshotName == "" && x.RelativePath == ancestor, cancellationToken);
            if (dbEntry != null)
            {
                dbEntry.IsStale = true;
            }

            QueueCalculation(datasetId, ancestor, null, force: true);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist stale status for ancestors in dataset {DatasetId}.", datasetId);
        }
    }

    public async Task RefreshStaleStatsAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken);

        using var scope = _scopeFactory.CreateScope();
        var datasetManager = scope.ServiceProvider.GetRequiredService<IDatasetManager>();

        var datasets = await datasetManager.GetAllDatasetsAsync(cancellationToken);
        var datasetMap = datasets.ToDictionary(d => d.Id);

        foreach (var kvp in _cache)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var stat = kvp.Value;

            // Only auto-refresh live datasets (not historical snapshots)
            if (!string.IsNullOrEmpty(stat.SnapshotName)) continue;
            if (!datasetMap.TryGetValue(stat.DatasetId, out var dataset)) continue;

            try
            {
                var fullPath = string.IsNullOrEmpty(stat.RelativePath)
                    ? dataset.Path
                    : PathSecurityHelper.GetSafeFullPath(dataset.Path, stat.RelativePath);

                if (!Directory.Exists(fullPath))
                {
                    _cache.TryRemove(kvp.Key, out _);
                    continue;
                }

                var dirInfo = new DirectoryInfo(fullPath);
                var isOlderThanOneHour = stat.CalculatedAtUtc.HasValue &&
                                         stat.CalculatedAtUtc.Value < DateTime.UtcNow.AddHours(-1);

                if (stat.IsStale || isOlderThanOneHour)
                {
                    QueueCalculation(stat.DatasetId, stat.RelativePath, null, force: true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error checking refresh staleness for path '{Path}'.", stat.RelativePath);
            }
        }
    }

    internal void UpdateCacheAndSave(
        int datasetId,
        string relativePath,
        string? snapshotName,
        long totalBytes,
        int filesCount,
        int dirsCount,
        DateTime lastModifiedAtUtc,
        IAppDbContext db)
    {
        var normPath = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var key = GetCacheKey(datasetId, normPath, snapshotName);
        var now = DateTime.UtcNow;

        var dto = new FolderStatsDto
        {
            DatasetId = datasetId,
            RelativePath = normPath,
            SnapshotName = snapshotName,
            TotalBytes = totalBytes,
            FilesCount = filesCount,
            DirectoriesCount = dirsCount,
            TotalSubitemsCount = filesCount + dirsCount,
            CalculatedAtUtc = now,
            IsCalculating = false,
            IsStale = false
        };

        _cache[key] = dto;

        var snapName = snapshotName ?? string.Empty;
        var existing = db.FolderStatsCaches
            .FirstOrDefault(x => x.DatasetId == datasetId && x.SnapshotName == snapName && x.RelativePath == normPath);

        if (existing == null)
        {
            db.FolderStatsCaches.Add(new FolderStatsCache
            {
                DatasetId = datasetId,
                RelativePath = normPath,
                SnapshotName = snapName,
                TotalBytes = totalBytes,
                FilesCount = filesCount,
                DirectoriesCount = dirsCount,
                TotalSubitemsCount = filesCount + dirsCount,
                LastModifiedAtUtc = lastModifiedAtUtc,
                CalculatedAtUtc = now,
                IsStale = false
            });
        }
        else
        {
            existing.TotalBytes = totalBytes;
            existing.FilesCount = filesCount;
            existing.DirectoriesCount = dirsCount;
            existing.TotalSubitemsCount = filesCount + dirsCount;
            existing.LastModifiedAtUtc = lastModifiedAtUtc;
            existing.CalculatedAtUtc = now;
            existing.IsStale = false;
        }
    }

    private static string GetCacheKey(int datasetId, string relativePath, string? snapshotName)
    {
        var snap = snapshotName ?? string.Empty;
        var path = PathSecurityHelper.NormalizeRelativePath(relativePath);
        return $"{datasetId}::{snap}::{path}";
    }

    private static List<string> GetAncestorPaths(string relativePath)
    {
        var clean = PathSecurityHelper.NormalizeRelativePath(relativePath);
        var result = new List<string>();

        // If the path itself is a folder or file, we start from its parent directory
        var current = clean;

        // Add the path itself if it was a folder or check parts
        var parts = current.Split('/', StringSplitOptions.RemoveEmptyEntries);
        
        // Add ancestors from deepest to root
        for (int i = parts.Length; i >= 1; i--)
        {
            var p = string.Join('/', parts.Take(i));
            result.Add(p);
        }

        // Always include dataset root ""
        if (!result.Contains(string.Empty))
        {
            result.Add(string.Empty);
        }

        return result;
    }
}
