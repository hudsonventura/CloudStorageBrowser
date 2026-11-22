namespace CloudStorageBrowser.Application.DTOs;

public class MediaMetadataDto
{
    // General
    public string? Format { get; set; }
    public TimeSpan? Duration { get; set; }
    public long? OverallBitrate { get; set; }

    // Image specifics
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? AspectRatio { get; set; }
    public string? ColorType { get; set; }
    public int? BitsPerPixel { get; set; }
    public int? ColorCount { get; set; }
    public string? ColorSpace { get; set; }

    // Exif / Camera specifics
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

    // Audio specifics
    public string? AudioCodec { get; set; }
    public long? AudioBitrate { get; set; }
    public int? AudioSampleRate { get; set; }
    public int? AudioChannels { get; set; }
    public string? AudioChannelLayout { get; set; }
    public string? AudioBitrateMode { get; set; } // "CBR" | "VBR"

    // Video specifics
    public string? VideoCodec { get; set; }
    public string? VideoProfile { get; set; }
    public long? VideoBitrate { get; set; }
    public double? FrameRate { get; set; }
    public string? PixelFormat { get; set; }
}
