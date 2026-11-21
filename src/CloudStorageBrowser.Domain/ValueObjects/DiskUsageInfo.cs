namespace CloudStorageBrowser.Domain.ValueObjects;

public class DiskUsageInfo
{
    public long TotalBytes { get; set; }
    public long FreeBytes { get; set; }
    public long UsedBytes => Math.Max(0, TotalBytes - FreeBytes);
    public double UsedPercentage => TotalBytes > 0 ? Math.Round((double)UsedBytes / TotalBytes * 100, 2) : 0;
}
