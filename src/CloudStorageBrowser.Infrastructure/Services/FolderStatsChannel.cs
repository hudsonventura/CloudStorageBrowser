using System.Collections.Concurrent;
using System.Threading.Channels;

namespace CloudStorageBrowser.Infrastructure.Services;

public record FolderCalculationTask(int DatasetId, string RelativePath, string? SnapshotName = null, bool Force = false);

public class FolderStatsChannel
{
    private readonly Channel<FolderCalculationTask> _channel;
    private readonly ConcurrentDictionary<string, byte> _enqueuedOrRunning = new(StringComparer.OrdinalIgnoreCase);

    public FolderStatsChannel()
    {
        var options = new UnboundedChannelOptions
        {
            SingleReader = false,
            SingleWriter = false
        };
        _channel = Channel.CreateUnbounded<FolderCalculationTask>(options);
    }

    public ChannelReader<FolderCalculationTask> Reader => _channel.Reader;

    public bool TryEnqueue(FolderCalculationTask task)
    {
        var key = GetTaskKey(task.DatasetId, task.RelativePath, task.SnapshotName);
        if (_enqueuedOrRunning.TryAdd(key, 0))
        {
            if (!_channel.Writer.TryWrite(task))
            {
                _enqueuedOrRunning.TryRemove(key, out _);
                return false;
            }
            return true;
        }
        return false;
    }

    public void MarkCompleted(FolderCalculationTask task)
    {
        var key = GetTaskKey(task.DatasetId, task.RelativePath, task.SnapshotName);
        _enqueuedOrRunning.TryRemove(key, out _);
    }

    public bool IsEnqueuedOrRunning(int datasetId, string relativePath, string? snapshotName = null)
    {
        var key = GetTaskKey(datasetId, relativePath, snapshotName);
        return _enqueuedOrRunning.ContainsKey(key);
    }

    private static string GetTaskKey(int datasetId, string relativePath, string? snapshotName)
    {
        var snap = snapshotName ?? string.Empty;
        var path = relativePath.Trim('/').Replace('\\', '/');
        return $"{datasetId}::{snap}::{path}";
    }
}
