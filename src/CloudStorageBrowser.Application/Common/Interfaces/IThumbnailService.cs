using CloudStorageBrowser.Domain.Entities;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IThumbnailService
{
    Task<(Stream Stream, string ContentType)?> GetOrCreateThumbnailAsync(
        DatasetConfig dataset,
        string relativePath,
        int width = 320,
        int height = 320,
        string? snapshotName = null,
        CancellationToken cancellationToken = default);
}
