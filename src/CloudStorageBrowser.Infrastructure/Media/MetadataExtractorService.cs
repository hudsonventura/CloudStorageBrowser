using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Domain.ValueObjects;
using CloudStorageBrowser.Infrastructure.Storage;
using MetadataExtractor;
using MetadataExtractor.Formats.Bmp;
using MetadataExtractor.Formats.Exif;
using MetadataExtractor.Formats.FileType;
using MetadataExtractor.Formats.Gif;
using MetadataExtractor.Formats.Jpeg;
using MetadataExtractor.Formats.Png;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace CloudStorageBrowser.Infrastructure.Media;

public class MetadataExtractorService : IMetadataExtractorService
{
    private readonly ILogger<MetadataExtractorService> _logger;

    public MetadataExtractorService(ILogger<MetadataExtractorService> logger)
    {
        _logger = logger;
    }

    public async Task<MediaMetadata?> ExtractMetadataAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var basePath = string.IsNullOrEmpty(snapshotName)
                ? dataset.Path
                : Path.Combine(dataset.Path, ".zfs", "snapshot", snapshotName);

            var cleanRel = PathSecurityHelper.NormalizeRelativePath(relativePath);
            var sourcePath = PathSecurityHelper.GetSafeFullPath(basePath, cleanRel);

            if (!File.Exists(sourcePath))
                return null;

            var ext = Path.GetExtension(sourcePath).ToLowerInvariant();
            var category = FileCategoryHelper.GetCategory(ext);

            if (category == FileCategory.Image)
            {
                return ExtractImageMetadata(sourcePath, ext);
            }

            if (category == FileCategory.Video || category == FileCategory.Audio)
            {
                return await ExtractAudioVideoMetadataAsync(sourcePath, category, ext, cancellationToken);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not extract metadata for {Path}", relativePath);
            return null;
        }
    }

    private MediaMetadata ExtractImageMetadata(string sourcePath, string ext)
    {
        var metadata = new MediaMetadata();

        // 1. SVG Vector Images
        if (ext == ".svg")
        {
            metadata.Format = "SVG";
            metadata.ColorType = "Vetorial / SVG";
            metadata.ColorCount = null;
            try
            {
                using var fs = File.OpenRead(sourcePath);
                using var reader = new StreamReader(fs);
                var buffer = new char[4096];
                var read = reader.Read(buffer, 0, buffer.Length);
                var head = new string(buffer, 0, read);

                var widthMatch = Regex.Match(head, @"width=[""']([\d\.]+)(?:px)?[""']", RegexOptions.IgnoreCase);
                var heightMatch = Regex.Match(head, @"height=[""']([\d\.]+)(?:px)?[""']", RegexOptions.IgnoreCase);
                if (widthMatch.Success && heightMatch.Success)
                {
                    if (double.TryParse(widthMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var w))
                        metadata.Width = (int)Math.Round(w);
                    if (double.TryParse(heightMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var h))
                        metadata.Height = (int)Math.Round(h);
                }
                else
                {
                    var viewBoxMatch = Regex.Match(head, @"viewBox=[""'][\d\.\s-]+[\s,]+[\d\.\s-]+[\s,]+([\d\.]+)[\s,]+([\d\.]+)[""']", RegexOptions.IgnoreCase);
                    if (viewBoxMatch.Success)
                    {
                        if (double.TryParse(viewBoxMatch.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var vw))
                            metadata.Width = (int)Math.Round(vw);
                        if (double.TryParse(viewBoxMatch.Groups[2].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var vh))
                            metadata.Height = (int)Math.Round(vh);
                    }
                }
            }
            catch { }

            metadata.AspectRatio = CalculateAspectRatio(metadata.Width, metadata.Height);
            return metadata;
        }

        // 2. SkiaSharp fast header inspection
        try
        {
            using var stream = File.OpenRead(sourcePath);
            using var codec = SKCodec.Create(stream);
            if (codec != null)
            {
                metadata.Width = codec.Info.Width;
                metadata.Height = codec.Info.Height;
                metadata.BitsPerPixel = codec.Info.BytesPerPixel * 8;
                metadata.ColorType = GetSkiaColorTypeDescription(codec.Info.ColorType, codec.Info.AlphaType);
            }
        }
        catch { }

        // 3. MetadataExtractor deep tags inspection
        try
        {
            var directories = ImageMetadataReader.ReadMetadata(sourcePath);

            // Detected File Type
            var fileTypeDir = directories.OfType<FileTypeDirectory>().FirstOrDefault();
            if (fileTypeDir != null)
            {
                var detectedName = fileTypeDir.GetDescription(FileTypeDirectory.TagDetectedFileTypeName);
                if (!string.IsNullOrEmpty(detectedName))
                {
                    metadata.Format = detectedName.ToUpperInvariant();
                }
            }
            if (string.IsNullOrEmpty(metadata.Format))
            {
                metadata.Format = ext.TrimStart('.').ToUpperInvariant();
            }

            // PNG Directory
            var pngDir = directories.OfType<PngDirectory>().FirstOrDefault();
            if (pngDir != null)
            {
                if (pngDir.TryGetInt32(PngDirectory.TagImageWidth, out var pw)) metadata.Width = pw;
                if (pngDir.TryGetInt32(PngDirectory.TagImageHeight, out var ph)) metadata.Height = ph;

                var colorTypeDesc = pngDir.GetDescription(PngDirectory.TagColorType);
                if (!string.IsNullOrEmpty(colorTypeDesc))
                {
                    metadata.ColorType = colorTypeDesc;
                }

                if (pngDir.TryGetInt32(PngDirectory.TagBitsPerSample, out var bits))
                {
                    metadata.BitsPerPixel = bits * (metadata.ColorType?.Contains("Alpha", StringComparison.OrdinalIgnoreCase) == true ? 4 : 3);
                    if (colorTypeDesc?.Contains("Indexed", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        metadata.ColorCount = 1 << bits;
                        metadata.ColorType = $"Indexado ({metadata.ColorCount} cores)";
                    }
                }
            }

            // GIF Directory
            var gifDir = directories.OfType<GifHeaderDirectory>().FirstOrDefault();
            if (gifDir != null)
            {
                if (gifDir.TryGetInt32(GifHeaderDirectory.TagImageWidth, out var gw)) metadata.Width = gw;
                if (gifDir.TryGetInt32(GifHeaderDirectory.TagImageHeight, out var gh)) metadata.Height = gh;

                if (gifDir.TryGetInt32(GifHeaderDirectory.TagColorTableSize, out var colorTableSize) && colorTableSize > 0)
                {
                    metadata.ColorCount = colorTableSize;
                    metadata.ColorType = $"Indexado ({colorTableSize} cores)";
                }
                else if (gifDir.TryGetInt32(GifHeaderDirectory.TagBitsPerPixel, out var bpp))
                {
                    metadata.BitsPerPixel = bpp;
                    metadata.ColorCount = 1 << bpp;
                    metadata.ColorType = $"Indexado ({metadata.ColorCount} cores)";
                }
            }

            // BMP Directory
            var bmpDir = directories.OfType<BmpHeaderDirectory>().FirstOrDefault();
            if (bmpDir != null)
            {
                if (bmpDir.TryGetInt32(BmpHeaderDirectory.TagImageWidth, out var bw)) metadata.Width = bw;
                if (bmpDir.TryGetInt32(BmpHeaderDirectory.TagImageHeight, out var bh)) metadata.Height = bh;

                if (bmpDir.TryGetInt32(BmpHeaderDirectory.TagBitsPerPixel, out var bmpBpp))
                {
                    metadata.BitsPerPixel = bmpBpp;
                    if (bmpBpp <= 8)
                    {
                        metadata.ColorCount = 1 << bmpBpp;
                        metadata.ColorType = $"Indexado ({metadata.ColorCount} cores)";
                    }
                    else
                    {
                        metadata.ColorType = $"{bmpBpp}-bit RGB";
                    }
                }
            }

            // JPEG Directory
            var jpegDir = directories.OfType<JpegDirectory>().FirstOrDefault();
            if (jpegDir != null)
            {
                if (jpegDir.TryGetInt32(JpegDirectory.TagImageWidth, out var jw)) metadata.Width = jw;
                if (jpegDir.TryGetInt32(JpegDirectory.TagImageHeight, out var jh)) metadata.Height = jh;

                if (jpegDir.TryGetInt32(JpegDirectory.TagNumberOfComponents, out var numComp))
                {
                    metadata.ColorType = numComp == 1
                        ? "Escala de Cinza (8-bit)"
                        : numComp == 4
                            ? "CMYK (32-bit)"
                            : "RGB / YCbCr (24-bit True Color)";
                    metadata.BitsPerPixel = numComp * 8;
                }
            }

            // Read Exif IFD0 directory (Camera make, model, software)
            var ifd0 = directories.OfType<ExifIfd0Directory>().FirstOrDefault();
            if (ifd0 != null)
            {
                metadata.CameraMake = ifd0.GetDescription(ExifDirectoryBase.TagMake);
                metadata.CameraModel = ifd0.GetDescription(ExifDirectoryBase.TagModel);
                metadata.Software = ifd0.GetDescription(ExifDirectoryBase.TagSoftware);
            }

            // Read Exif SubIFD directory (FNumber, ISO, Exposure, Date taken, Dimensions)
            var subIfd = directories.OfType<ExifSubIfdDirectory>().FirstOrDefault();
            if (subIfd != null)
            {
                metadata.FNumber = subIfd.GetDescription(ExifDirectoryBase.TagFNumber);
                metadata.ExposureTime = subIfd.GetDescription(ExifDirectoryBase.TagExposureTime);
                metadata.IsoSpeed = subIfd.GetDescription(ExifDirectoryBase.TagIsoEquivalent);
                metadata.Lens = subIfd.GetDescription(ExifDirectoryBase.TagLensModel);

                if (subIfd.TryGetDateTime(ExifDirectoryBase.TagDateTimeOriginal, out var dateTaken))
                {
                    metadata.DateTaken = dateTaken;
                }

                if (!metadata.Width.HasValue && subIfd.TryGetInt32(ExifDirectoryBase.TagExifImageWidth, out var w))
                    metadata.Width = w;

                if (!metadata.Height.HasValue && subIfd.TryGetInt32(ExifDirectoryBase.TagExifImageHeight, out var h))
                    metadata.Height = h;

                metadata.ColorSpace = subIfd.GetDescription(ExifDirectoryBase.TagColorSpace);
            }

            // Read GPS directory
            var gps = directories.OfType<GpsDirectory>().FirstOrDefault();
            if (gps != null)
            {
                var geoLocation = gps.GetGeoLocation();
                if (geoLocation.HasValue && !geoLocation.Value.IsZero)
                {
                    metadata.Latitude = geoLocation.Value.Latitude;
                    metadata.Longitude = geoLocation.Value.Longitude;
                }

                if (gps.TryGetRational(GpsDirectory.TagAltitude, out var alt))
                {
                    metadata.Altitude = alt.ToDouble();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "MetadataExtractor failed for image {Path}", sourcePath);
        }

        // Color count fallback for standard 24-bit/32-bit if not indexed
        if (!metadata.ColorCount.HasValue && metadata.BitsPerPixel.HasValue)
        {
            if (metadata.BitsPerPixel >= 24)
            {
                metadata.ColorCount = 16777216; // 16.7M (True Color)
            }
            else if (metadata.BitsPerPixel == 8 && metadata.ColorType?.Contains("Cinza", StringComparison.OrdinalIgnoreCase) == true)
            {
                metadata.ColorCount = 256;
            }
        }

        metadata.AspectRatio = CalculateAspectRatio(metadata.Width, metadata.Height);
        return metadata;
    }

    private async Task<MediaMetadata?> ExtractAudioVideoMetadataAsync(
        string sourcePath,
        FileCategory category,
        string ext,
        CancellationToken cancellationToken)
    {
        var metadata = new MediaMetadata
        {
            Format = ext.TrimStart('.').ToUpperInvariant()
        };

        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "ffprobe",
                Arguments = $"-v quiet -print_format json -show_format -show_streams \"{sourcePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process != null)
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(5));

                var outputTask = process.StandardOutput.ReadToEndAsync(cts.Token);
                await process.WaitForExitAsync(cts.Token);

                var jsonOutput = await outputTask;
                if (process.ExitCode == 0 && !string.IsNullOrWhiteSpace(jsonOutput))
                {
                    ParseFfprobeJson(jsonOutput, metadata, category, ext);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "FFprobe execution failed for {Path}", sourcePath);
        }

        // Determine VBR / CBR mode for audio files
        if (category == FileCategory.Audio || !string.IsNullOrEmpty(metadata.AudioCodec))
        {
            if (string.IsNullOrEmpty(metadata.AudioBitrateMode))
            {
                metadata.AudioBitrateMode = DetermineAudioBitrateMode(sourcePath, ext, metadata);
            }
        }

        return metadata;
    }

    private static void ParseFfprobeJson(string jsonOutput, MediaMetadata metadata, FileCategory category, string ext)
    {
        using var doc = JsonDocument.Parse(jsonOutput);
        var root = doc.RootElement;

        // 1. Format container
        if (root.TryGetProperty("format", out var formatElement))
        {
            if (formatElement.TryGetProperty("duration", out var durProp) &&
                double.TryParse(durProp.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var durationSec))
            {
                metadata.Duration = TimeSpan.FromSeconds(durationSec);
            }

            if (formatElement.TryGetProperty("bit_rate", out var brProp) &&
                long.TryParse(brProp.GetString(), out var overallBitrate))
            {
                metadata.OverallBitrate = overallBitrate;
            }

            if (formatElement.TryGetProperty("format_name", out var fnProp))
            {
                var fn = fnProp.GetString();
                if (!string.IsNullOrEmpty(fn))
                {
                    metadata.Format = GetFriendlyFormat(ext, fn);
                }
            }
        }

        // 2. Streams (Video and Audio)
        if (root.TryGetProperty("streams", out var streamsElement) && streamsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var stream in streamsElement.EnumerateArray())
            {
                if (!stream.TryGetProperty("codec_type", out var typeProp)) continue;
                var codecType = typeProp.GetString();

                // Video Stream
                if (codecType == "video" && string.IsNullOrEmpty(metadata.VideoCodec))
                {
                    var codecName = stream.TryGetProperty("codec_name", out var cn) ? cn.GetString() : null;
                    var codecLongName = stream.TryGetProperty("codec_long_name", out var cln) ? cln.GetString() : null;
                    metadata.VideoCodec = GetFriendlyVideoCodec(codecName, codecLongName);

                    if (stream.TryGetProperty("profile", out var prof))
                    {
                        metadata.VideoProfile = prof.GetString();
                    }

                    if (stream.TryGetProperty("width", out var w)) metadata.Width = w.GetInt32();
                    if (stream.TryGetProperty("height", out var h)) metadata.Height = h.GetInt32();

                    if (stream.TryGetProperty("display_aspect_ratio", out var dar) && !string.IsNullOrEmpty(dar.GetString()) && dar.GetString() != "0:1")
                    {
                        metadata.AspectRatio = dar.GetString();
                    }
                    else
                    {
                        metadata.AspectRatio = CalculateAspectRatio(metadata.Width, metadata.Height);
                    }

                    if (stream.TryGetProperty("pix_fmt", out var pf))
                    {
                        metadata.PixelFormat = pf.GetString();
                    }

                    if (stream.TryGetProperty("bit_rate", out var vbr) && long.TryParse(vbr.GetString(), out var vb))
                    {
                        metadata.VideoBitrate = vb;
                    }

                    // Frame rate calculation
                    if (stream.TryGetProperty("r_frame_rate", out var rfr))
                    {
                        metadata.FrameRate = ParseFrameRate(rfr.GetString());
                    }
                    else if (stream.TryGetProperty("avg_frame_rate", out var afr))
                    {
                        metadata.FrameRate = ParseFrameRate(afr.GetString());
                    }
                }

                // Audio Stream (either in audio file or integrated in video)
                if (codecType == "audio" && string.IsNullOrEmpty(metadata.AudioCodec))
                {
                    var codecName = stream.TryGetProperty("codec_name", out var acn) ? acn.GetString() : null;
                    var codecLongName = stream.TryGetProperty("codec_long_name", out var acln) ? acln.GetString() : null;
                    metadata.AudioCodec = GetFriendlyAudioCodec(codecName, codecLongName);

                    if (stream.TryGetProperty("sample_rate", out var sr) && int.TryParse(sr.GetString(), out var sRate))
                    {
                        metadata.AudioSampleRate = sRate;
                    }

                    if (stream.TryGetProperty("channels", out var ch))
                    {
                        metadata.AudioChannels = ch.GetInt32();
                    }

                    if (stream.TryGetProperty("channel_layout", out var chl))
                    {
                        metadata.AudioChannelLayout = chl.GetString();
                    }

                    if (stream.TryGetProperty("bit_rate", out var abr) && long.TryParse(abr.GetString(), out var ab))
                    {
                        metadata.AudioBitrate = ab;
                    }
                    else if (category == FileCategory.Audio && metadata.OverallBitrate.HasValue)
                    {
                        metadata.AudioBitrate = metadata.OverallBitrate.Value;
                    }
                }
            }
        }
    }

    private static string DetermineAudioBitrateMode(string sourcePath, string ext, MediaMetadata metadata)
    {
        var codec = metadata.AudioCodec?.ToLowerInvariant() ?? string.Empty;

        // Uncompressed PCM is strictly CBR
        if (ext == ".wav" || codec.Contains("pcm")) return "CBR";

        // Lossless formats are inherently VBR
        if (ext == ".flac" || codec.Contains("flac") || codec.Contains("alac") || ext == ".ape") return "VBR";

        // Opus is VBR by design
        if (ext == ".opus" || codec.Contains("opus")) return "VBR";

        // For MP3, check initial Xing / Info / VBRI header in the first 4KB
        if (ext == ".mp3" || codec.Contains("mp3"))
        {
            try
            {
                using var fs = File.OpenRead(sourcePath);
                var buffer = new byte[Math.Min(fs.Length, 4096)];
                var read = fs.Read(buffer, 0, buffer.Length);
                var text = System.Text.Encoding.ASCII.GetString(buffer, 0, read);

                if (text.Contains("Xing") || text.Contains("VBRI")) return "VBR";
                if (text.Contains("Info")) return "CBR";
            }
            catch { }
        }

        // Fallback: If overall bitrate is present and differs noticeably from stream bitrate
        if (metadata.AudioBitrate.HasValue && metadata.OverallBitrate.HasValue)
        {
            var diff = Math.Abs(metadata.AudioBitrate.Value - metadata.OverallBitrate.Value);
            if (diff > metadata.AudioBitrate.Value * 0.15) return "VBR";
        }

        return "CBR";
    }

    private static double? ParseFrameRate(string? fraction)
    {
        if (string.IsNullOrEmpty(fraction)) return null;
        var parts = fraction.Split('/');
        if (parts.Length == 2 &&
            double.TryParse(parts[0], NumberStyles.Any, CultureInfo.InvariantCulture, out var num) &&
            double.TryParse(parts[1], NumberStyles.Any, CultureInfo.InvariantCulture, out var den) &&
            den > 0)
        {
            var fps = num / den;
            return Math.Round(fps, 2);
        }
        if (double.TryParse(fraction, NumberStyles.Any, CultureInfo.InvariantCulture, out var val))
        {
            return Math.Round(val, 2);
        }
        return null;
    }

    private static string? CalculateAspectRatio(int? width, int? height)
    {
        if (!width.HasValue || !height.HasValue || width.Value <= 0 || height.Value <= 0)
            return null;

        var w = width.Value;
        var h = height.Value;

        var ratio = (double)w / h;
        if (Math.Abs(ratio - 16.0 / 9.0) < 0.02) return "16:9";
        if (Math.Abs(ratio - 4.0 / 3.0) < 0.02) return "4:3";
        if (Math.Abs(ratio - 1.0) < 0.02) return "1:1";
        if (Math.Abs(ratio - 3.0 / 2.0) < 0.02) return "3:2";
        if (Math.Abs(ratio - 21.0 / 9.0) < 0.03) return "21:9";
        if (Math.Abs(ratio - 9.0 / 16.0) < 0.02) return "9:16";

        static int Gcd(int a, int b) => b == 0 ? a : Gcd(b, a % b);
        var divisor = Gcd(w, h);
        var rw = w / divisor;
        var rh = h / divisor;
        if (rw <= 32 && rh <= 32) return $"{rw}:{rh}";

        return $"{ratio:0.##}:1";
    }

    private static string GetFriendlyVideoCodec(string? name, string? longName)
    {
        if (string.IsNullOrEmpty(name)) return longName ?? "Vídeo";
        var lower = name.ToLowerInvariant();
        return lower switch
        {
            "h264" or "avc1" => "H.264 / AVC",
            "hevc" or "h265" or "hev1" or "hvc1" => "H.265 / HEVC",
            "av1" or "av01" => "AV1",
            "vp9" => "VP9",
            "vp8" => "VP8",
            "mpeg4" => "MPEG-4 Part 2",
            "mpeg2video" => "MPEG-2",
            "prores" => "Apple ProRes",
            "mjpeg" => "Motion JPEG",
            "wmv3" or "vc1" => "Windows Media Video (VC-1)",
            _ => !string.IsNullOrEmpty(longName) ? longName : name.ToUpperInvariant()
        };
    }

    private static string GetFriendlyAudioCodec(string? name, string? longName)
    {
        if (string.IsNullOrEmpty(name)) return longName ?? "Áudio";
        var lower = name.ToLowerInvariant();
        if (lower.StartsWith("pcm_")) return "PCM (WAV sem compressão)";
        return lower switch
        {
            "mp3" => "MP3 (MPEG Audio Layer 3)",
            "aac" => "AAC (Advanced Audio Coding)",
            "flac" => "FLAC (Lossless)",
            "alac" => "ALAC (Apple Lossless)",
            "opus" => "Opus",
            "vorbis" => "Ogg Vorbis",
            "ac3" => "AC-3 (Dolby Digital)",
            "eac3" => "E-AC-3 (Dolby Digital Plus)",
            "dts" or "dca" => "DTS",
            "wma" or "wmav2" => "WMA (Windows Media Audio)",
            _ => !string.IsNullOrEmpty(longName) ? longName : name.ToUpperInvariant()
        };
    }

    private static string GetFriendlyFormat(string ext, string? formatName)
    {
        var cleanExt = ext.TrimStart('.').ToUpperInvariant();
        if (!string.IsNullOrEmpty(cleanExt)) return cleanExt;
        if (string.IsNullOrEmpty(formatName)) return "Mídia";
        var first = formatName.Split(',')[0].Trim().ToUpperInvariant();
        return first switch
        {
            "MOV" or "MP4" or "M4A" => "MP4",
            "MATROSKA" or "WEBM" => "MKV",
            _ => first
        };
    }

    private static string GetSkiaColorTypeDescription(SKColorType colorType, SKAlphaType alphaType)
    {
        var hasAlpha = alphaType != SKAlphaType.Opaque && alphaType != SKAlphaType.Unknown;
        return colorType switch
        {
            SKColorType.Rgba8888 => hasAlpha ? "RGBA (32 bits com Alpha)" : "RGB (24 bits True Color)",
            SKColorType.Bgra8888 => hasAlpha ? "BGRA (32 bits com Alpha)" : "BGR (24 bits True Color)",
            SKColorType.Rgb888x => "RGB (24 bits True Color)",
            SKColorType.Rgb565 => "RGB (16 bits High Color)",
            SKColorType.Gray8 => "Escala de Cinza (8 bits / 256 tons)",
            SKColorType.RgbaF16 => "RGBA HDR (64 bits Float16)",
            SKColorType.Rgba1010102 => "RGBA 10-bit HDR (1,07 bilhão de cores)",
            _ => colorType.ToString()
        };
    }
}
