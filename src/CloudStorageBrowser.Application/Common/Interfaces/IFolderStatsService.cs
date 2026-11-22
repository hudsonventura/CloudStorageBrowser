using CloudStorageBrowser.Application.DTOs;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IFolderStatsService
{
    /// <summary>
    /// Gets folder stats from memory or db cache. If not found or stale, queues background calculation.
    /// </summary>
    Task<FolderStatsDto?> GetFolderStatsAsync(
        int datasetId,
        string relativePath,
        string? snapshotName = null,
        bool queueIfMissing = true,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets folder stats for a batch of subdirectories. Missing ones are queued for background calculation.
    /// </summary>
    Task<Dictionary<string, FolderStatsDto>> GetBatchFolderStatsAsync(
        int datasetId,
        IEnumerable<string> relativePaths,
        string? snapshotName = null,
        bool queueIfMissing = true,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enqueues background calculation for a folder.
    /// </summary>
    void QueueCalculation(int datasetId, string relativePath, string? snapshotName = null, bool force = false);

    /// <summary>
    /// Enqueues background calculation for multiple folders.
    /// </summary>
    void QueueCalculations(int datasetId, IEnumerable<string> relativePaths, string? snapshotName = null, bool force = false);

    /// <summary>
    /// Invalidates cache for a path and all its ancestor folders up to root, and enqueues background recalculation.
    /// </summary>
    Task InvalidateAndRecalculateAncestorsAsync(
        int datasetId,
        string relativePath,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Periodic refresh check: scans cached folders, checks directory LastWriteTimeUtc or staleness, and queues calculations.
    /// </summary>
    Task RefreshStaleStatsAsync(CancellationToken cancellationToken = default);
}
