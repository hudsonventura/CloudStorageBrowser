using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.ValueObjects;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface ISnapshotService
{
    Task<bool> HasSnapshotsAsync(
        DatasetConfig dataset,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SnapshotInfo>> GetVersionsAsync(
        DatasetConfig dataset,
        string relativePath,
        bool onlyModified = true,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)> OpenSnapshotReadAsync(
        DatasetConfig dataset,
        string relativePath,
        string snapshotName,
        CancellationToken cancellationToken = default);
}
