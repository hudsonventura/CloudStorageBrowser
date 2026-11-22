using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Services;

public class FolderStatsBackgroundWorker : BackgroundService
{
    private readonly FolderStatsChannel _channel;
    private readonly FolderStatsService _folderStatsService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FolderStatsBackgroundWorker> _logger;

    public FolderStatsBackgroundWorker(
        FolderStatsChannel channel,
        FolderStatsService folderStatsService,
        IServiceScopeFactory scopeFactory,
        ILogger<FolderStatsBackgroundWorker> logger)
    {
        _channel = channel;
        _folderStatsService = folderStatsService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FolderStatsBackgroundWorker started.");

        var queueTask = ProcessQueueLoopAsync(stoppingToken);
        var periodicTask = PeriodicRefreshLoopAsync(stoppingToken);

        await Task.WhenAll(queueTask, periodicTask);
    }

    private async Task ProcessQueueLoopAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            FolderCalculationTask task;
            try
            {
                task = await _channel.Reader.ReadAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                await ProcessTaskAsync(task, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate folder stats for dataset {DatasetId}, path '{Path}'", task.DatasetId, task.RelativePath);
            }
            finally
            {
                _channel.MarkCompleted(task);
            }
        }
    }

    private async Task PeriodicRefreshLoopAsync(CancellationToken stoppingToken)
    {
        // Initial delay before first background refresh check
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
                await _folderStatsService.RefreshStaleStatsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error during periodic folder stats refresh check.");
            }
        }
    }

    private async Task ProcessTaskAsync(FolderCalculationTask task, CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var datasetManager = scope.ServiceProvider.GetRequiredService<IDatasetManager>();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

        var dataset = await datasetManager.GetDatasetByIdAsync(task.DatasetId, stoppingToken);
        if (dataset == null) return;

        string fullPath;
        if (!string.IsNullOrEmpty(task.SnapshotName))
        {
            var snapBasePath = Path.Combine(dataset.Path, ".zfs", "snapshot", task.SnapshotName);
            fullPath = string.IsNullOrEmpty(task.RelativePath)
                ? snapBasePath
                : PathSecurityHelper.GetSafeFullPath(snapBasePath, task.RelativePath);
        }
        else
        {
            fullPath = string.IsNullOrEmpty(task.RelativePath)
                ? dataset.Path
                : PathSecurityHelper.GetSafeFullPath(dataset.Path, task.RelativePath);
        }

        if (!Directory.Exists(fullPath))
        {
            _logger.LogDebug("Directory '{Path}' does not exist on disk. Skipping stats.", fullPath);
            return;
        }

        var dirInfo = new DirectoryInfo(fullPath);
        var lastModified = dirInfo.LastWriteTimeUtc;

        long totalBytes = 0;
        int filesCount = 0;
        int dirsCount = 0;

        var queue = new Queue<string>();
        queue.Enqueue(fullPath);

        while (queue.Count > 0)
        {
            stoppingToken.ThrowIfCancellationRequested();
            var currentDir = queue.Dequeue();

            DirectoryInfo currentInfo;
            try
            {
                currentInfo = new DirectoryInfo(currentDir);
                if (!currentInfo.Exists) continue;
            }
            catch
            {
                continue;
            }

            try
            {
                foreach (var subDir in currentInfo.EnumerateDirectories())
                {
                    // Never traverse into .zfs snapshot system directories
                    if (subDir.Name.Equals(".zfs", StringComparison.OrdinalIgnoreCase))
                        continue;

                    dirsCount++;
                    queue.Enqueue(subDir.FullName);
                }

                foreach (var file in currentInfo.EnumerateFiles())
                {
                    filesCount++;
                    try
                    {
                        totalBytes += file.Length;
                    }
                    catch
                    {
                        // Ignore locked or transient files
                    }
                }
            }
            catch (UnauthorizedAccessException)
            {
                // Skip directories with access restrictions
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Warning enumerating directory '{Path}'", currentDir);
            }
        }

        _folderStatsService.UpdateCacheAndSave(
            task.DatasetId,
            task.RelativePath,
            task.SnapshotName,
            totalBytes,
            filesCount,
            dirsCount,
            lastModified,
            db);

        await db.SaveChangesAsync(stoppingToken);

        _logger.LogDebug("Calculated stats for dataset {DatasetId}, path '{Path}': {Bytes} bytes, {Files} files, {Dirs} dirs",
            task.DatasetId, task.RelativePath, totalBytes, filesCount, dirsCount);
    }
}
