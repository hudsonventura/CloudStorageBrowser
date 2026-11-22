namespace CloudStorageBrowser.Domain.Entities;

public class FolderStatsCache
{
    public int Id { get; set; }
    public int DatasetId { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string SnapshotName { get; set; } = string.Empty;
    public long TotalBytes { get; set; }
    public int FilesCount { get; set; }
    public int DirectoriesCount { get; set; }
    public int TotalSubitemsCount { get; set; }
    public DateTime LastModifiedAtUtc { get; set; }
    public DateTime CalculatedAtUtc { get; set; }
    public bool IsStale { get; set; }
}
