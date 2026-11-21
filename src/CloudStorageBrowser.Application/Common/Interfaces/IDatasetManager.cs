using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IDatasetManager
{
    Task<IReadOnlyList<DatasetDto>> GetAllDatasetsAsync(CancellationToken cancellationToken = default);
    Task<DatasetConfig?> GetDatasetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task RescanDatasetsAsync(CancellationToken cancellationToken = default);
}
