using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Domain.ValueObjects;

public class SnapshotInfo
{
    public string SnapshotName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string SnapshotFullPath { get; set; } = string.Empty;
    public ItemType Type { get; set; }
    public long Size { get; set; }
    public DateTime LastModifiedAtUtc { get; set; }
    public SnapshotChangeStatus ChangeStatus { get; set; } = SnapshotChangeStatus.Unchanged;
}
