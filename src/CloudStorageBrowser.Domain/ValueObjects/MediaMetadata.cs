namespace CloudStorageBrowser.Domain.ValueObjects;

public class MediaMetadata
{
    public int? Width { get; set; }
    public int? Height { get; set; }
    public TimeSpan? Duration { get; set; }
    public string? CameraMake { get; set; }
    public string? CameraModel { get; set; }
    public string? Lens { get; set; }
    public string? FNumber { get; set; }
    public string? ExposureTime { get; set; }
    public string? IsoSpeed { get; set; }
    public DateTime? DateTaken { get; set; }
    public string? Software { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? Altitude { get; set; }
}
