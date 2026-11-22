using CloudStorageBrowser.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<DatasetConfig> Datasets { get; }
    DbSet<AppSetting> Settings { get; }
    DbSet<FolderStatsCache> FolderStatsCaches { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
