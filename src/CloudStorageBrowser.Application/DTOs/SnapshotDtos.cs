using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Application.DTOs;

public class SnapshotVersionDto
{
    public string SnapshotName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public ItemType Type { get; set; }
    public long Size { get; set; }
    public DateTime LastModifiedAtUtc { get; set; }
    public SnapshotChangeStatus ChangeStatus { get; set; }
    public string FormattedDate => Timestamp.ToString("yyyy-MM-dd HH:mm:ss");
}

public class SnapshotBrowseRequestDto
{
    public int DatasetId { get; set; }
    public string SnapshotName { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
}
