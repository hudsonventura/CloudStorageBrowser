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
