using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Services;

public class DatasetManager : IDatasetManager
{
    private readonly AppDbContext _context;
    private readonly IStorageService _storageService;
    private readonly ISnapshotService _snapshotService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatasetManager> _logger;

    public DatasetManager(
        AppDbContext context,
        IStorageService storageService,
        ISnapshotService snapshotService,
        IConfiguration configuration,
        ILogger<DatasetManager> logger)
    {
        _context = context;
        _storageService = storageService;
        _snapshotService = snapshotService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DatasetDto>> GetAllDatasetsAsync(CancellationToken cancellationToken = default)
    {
        await RescanDatasetsAsync(cancellationToken);

        var allEntities = await _context.Datasets
            .Where(d => d.IsVisible)
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);

        var entities = allEntities.Where(d => Directory.Exists(d.Path)).ToList();

        var list = new List<DatasetDto>();

        foreach (var entity in entities)
        {
            var usage = await _storageService.GetDiskUsageAsync(entity, cancellationToken);
            var hasShadow = await _snapshotService.HasSnapshotsAsync(entity, cancellationToken);

            list.Add(new DatasetDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Path = entity.Path,
                AccessMode = entity.AccessMode,
                Description = entity.Description,
                HasShadowCopy = hasShadow,
                TotalBytes = usage.TotalBytes,
                FreeBytes = usage.FreeBytes,
                UsedBytes = usage.UsedBytes,
                UsedPercentage = usage.UsedPercentage
            });
        }

        return list;
    }

    public async Task<DatasetConfig?> GetDatasetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Datasets.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null || !Directory.Exists(entity.Path))
        {
            return null;
        }
        return entity;
    }

    public async Task RescanDatasetsAsync(CancellationToken cancellationToken = default)
    {
        var rawDatasetsDir = _configuration["DATASETS_DIR"] ?? "datasets";
        string baseDatasetsDir;

        if (Path.IsPathRooted(rawDatasetsDir))
        {
            baseDatasetsDir = rawDatasetsDir;
        }
        else
        {
            // Check both current directory and parent repository root
            var localPath = Path.GetFullPath(rawDatasetsDir);
            var parentPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", rawDatasetsDir));

            if (Directory.Exists(parentPath))
            {
                baseDatasetsDir = parentPath;
            }
            else
            {
                baseDatasetsDir = localPath;
            }
        }

        if (!Directory.Exists(baseDatasetsDir))
        {
            Directory.CreateDirectory(baseDatasetsDir);
        }

        var subDirs = Directory.GetDirectories(baseDatasetsDir);
        var existingInDb = await _context.Datasets.ToListAsync(cancellationToken);

        // 1. Remove datasets from DB that are no longer mapped or no longer exist on disk
        var activeSubDirs = new HashSet<string>(subDirs, StringComparer.OrdinalIgnoreCase);
        foreach (var existing in existingInDb)
        {
            if (!Directory.Exists(existing.Path) || !activeSubDirs.Contains(existing.Path))
            {
                _logger.LogInformation("Removing unmapped or missing dataset: {Name} at {Path}", existing.Name, existing.Path);
                _context.Datasets.Remove(existing);
            }
        }

        // 2. Register or update detected datasets
        foreach (var subDir in subDirs)
        {
            var dirName = Path.GetFileName(subDir);
            var isReadOnly = dirName.EndsWith(":ro", StringComparison.OrdinalIgnoreCase) ||
                             IsDirectoryReadOnly(subDir);

            var cleanName = dirName.Replace(":ro", "", StringComparison.OrdinalIgnoreCase).Trim();

            var existing = existingInDb.FirstOrDefault(x => x.Path.Equals(subDir, StringComparison.OrdinalIgnoreCase) ||
                                                           x.Name.Equals(cleanName, StringComparison.OrdinalIgnoreCase));

            if (existing == null)
            {
                _logger.LogInformation("Auto-registering detected dataset: {Name} at {Path}", cleanName, subDir);
                _context.Datasets.Add(new DatasetConfig
                {
                    Name = cleanName,
                    Path = subDir,
                    AccessMode = isReadOnly ? DatasetAccessMode.ReadOnly : DatasetAccessMode.ReadWrite,
                    Description = isReadOnly ? "Volume somente leitura (:ro)" : "Volume padrão",
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                if (existing.Path != subDir)
                {
                    existing.Path = subDir;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
                if (isReadOnly && existing.AccessMode != DatasetAccessMode.ReadOnly)
                {
                    existing.AccessMode = DatasetAccessMode.ReadOnly;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
                else if (!isReadOnly && existing.AccessMode == DatasetAccessMode.ReadOnly && !dirName.EndsWith(":ro", StringComparison.OrdinalIgnoreCase))
                {
                    existing.AccessMode = DatasetAccessMode.ReadWrite;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static bool IsDirectoryReadOnly(string path)
    {
        try
        {
            // Test if directory is writable by touching a temporary file
            var testFile = Path.Combine(path, $".test_rw_{Guid.NewGuid():N}");
            using (File.Create(testFile)) { }
            File.Delete(testFile);
            return false;
        }
        catch
        {
            return true;
        }
    }
}
