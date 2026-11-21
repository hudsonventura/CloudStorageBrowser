using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.ValueObjects;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IMetadataExtractorService
{
    Task<MediaMetadata?> ExtractMetadataAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default);
}
