using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(
        AppDbContext context,
        IAuthService authService,
        IDatasetManager datasetManager,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        await context.Database.EnsureCreatedAsync(cancellationToken);

        // Ensure FolderStatsCaches table exists in case the SQLite DB was already created previously
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS FolderStatsCaches (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    DatasetId INTEGER NOT NULL,
    RelativePath TEXT NOT NULL,
    SnapshotName TEXT NOT NULL DEFAULT '',
    TotalBytes INTEGER NOT NULL,
    FilesCount INTEGER NOT NULL,
    DirectoriesCount INTEGER NOT NULL,
    TotalSubitemsCount INTEGER NOT NULL,
    LastModifiedAtUtc TEXT NOT NULL,
    CalculatedAtUtc TEXT NOT NULL,
    IsStale INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_FolderStatsCaches_DatasetId_SnapshotName_RelativePath 
ON FolderStatsCaches (DatasetId, SnapshotName, RelativePath);
", cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to ensure FolderStatsCaches table exists.");
        }

        // Seed initial default user: admin / admin if no users exist
        if (!await context.Users.AnyAsync(cancellationToken))
        {
            logger.LogInformation("No users found in database. Seeding default user 'admin'/'admin'...");
            var adminUser = new User
            {
                Username = "admin",
                PasswordHash = authService.HashPassword("admin"),
                Role = UserRole.Admin,
                CreatedAtUtc = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Default admin user created successfully.");
        }

        // Rescan datasets from DATASETS_DIR to populate or synchronize Datasets
        try
        {
            await datasetManager.RescanDatasetsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to auto-rescan datasets on startup.");
        }
    }
}
