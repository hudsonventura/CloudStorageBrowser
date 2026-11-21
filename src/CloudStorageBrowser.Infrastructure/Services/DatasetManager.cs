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
        var entities = await _context.Datasets
            .Where(d => d.IsVisible)
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);

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
        return await _context.Datasets.FindAsync(new object[] { id }, cancellationToken);
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
            else if (isReadOnly && existing.AccessMode != DatasetAccessMode.ReadOnly)
            {
                existing.AccessMode = DatasetAccessMode.ReadOnly;
                existing.UpdatedAtUtc = DateTime.UtcNow;
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
