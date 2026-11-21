using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace CloudStorageBrowser.Infrastructure.Media;

public class ThumbnailService : IThumbnailService
{
    private readonly string _cacheDirectory;
    private readonly ILogger<ThumbnailService> _logger;

    public ThumbnailService(IConfiguration configuration, ILogger<ThumbnailService> logger)
    {
        _logger = logger;
        var rawCache = configuration["CACHE_DIR"] ?? "cache";
        string baseCache;
        if (Path.IsPathRooted(rawCache))
        {
            baseCache = rawCache;
        }
        else
        {
            var parentPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", rawCache));
            baseCache = Directory.Exists(parentPath) ? parentPath : Path.GetFullPath(rawCache);
        }
        _cacheDirectory = Path.Combine(baseCache, "thumbnails");

        if (!Directory.Exists(_cacheDirectory))
        {
            Directory.CreateDirectory(_cacheDirectory);
        }
    }

    public async Task<(Stream Stream, string ContentType)?> GetOrCreateThumbnailAsync(
        DatasetConfig dataset,
        string relativePath,
        int width = 320,
        int height = 320,
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
            {
                return null;
            }

            var fileInfo = new FileInfo(sourcePath);
            var ext = fileInfo.Extension.ToLowerInvariant();

            // Cache key based on source path, modification time, dimensions and snapshot
            var cacheKey = ComputeCacheKey(dataset.Id, cleanRel, snapshotName, fileInfo.LastWriteTimeUtc.Ticks, width, height);
            var cacheWebp = Path.Combine(_cacheDirectory, $"{cacheKey}.webp");
            var cacheJpg = Path.Combine(_cacheDirectory, $"{cacheKey}.jpg");

            // If thumbnail already exists on disk, serve it directly
            if (File.Exists(cacheWebp))
            {
                var cachedStream = new FileStream(cacheWebp, FileMode.Open, FileAccess.Read, FileShare.Read);
                return (cachedStream, "image/webp");
            }
            if (File.Exists(cacheJpg))
            {
                var cachedStream = new FileStream(cacheJpg, FileMode.Open, FileAccess.Read, FileShare.Read);
                return (cachedStream, "image/jpeg");
            }

            // On-demand generation with high-quality smoothing
            (byte[] Bytes, string ContentType)? generated = null;

            // 1. Primary engine: FFmpeg with Lanczos scaling filter for pristine antialiasing / smoothing
            if (IsImage(ext) || IsVideo(ext))
            {
                generated = await GenerateFfmpegThumbnailAsync(sourcePath, width, height, IsVideo(ext), cancellationToken);
            }

            // 2. Fallback engine: SkiaSharp with CatmullRom cubic smoothing if FFmpeg is unavailable
            if (generated == null && IsImage(ext))
            {
                generated = await GenerateSkiaSharpThumbnailAsync(sourcePath, width, height, cancellationToken);
            }

            if (generated != null && generated.Value.Bytes.Length > 0)
            {
                try
                {
                    var targetFile = generated.Value.ContentType == "image/webp" ? cacheWebp : cacheJpg;
                    await File.WriteAllBytesAsync(targetFile, generated.Value.Bytes, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to write thumbnail cache to disk; serving from memory.");
                }

                var stream = new MemoryStream(generated.Value.Bytes);
                return (stream, generated.Value.ContentType);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not generate thumbnail for {Dataset}/{Path}", dataset.Name, relativePath);
            return null;
        }
    }

    private async Task<(byte[] Bytes, string ContentType)?> GenerateFfmpegThumbnailAsync(
        string sourcePath,
        int targetWidth,
        int targetHeight,
        bool isVideo,
        CancellationToken cancellationToken)
    {
        var tempOutPath = Path.Combine(Path.GetTempPath(), $"thumb_{Guid.NewGuid():N}.jpg");

        try
        {
            var vfFilter = isVideo
                ? $"thumbnail,scale={targetWidth}:{targetHeight}:force_original_aspect_ratio=decrease:flags=lanczos"
                : $"scale={targetWidth}:{targetHeight}:force_original_aspect_ratio=decrease:flags=lanczos";

            var arguments = isVideo
                ? $"-ss 00:00:01 -i \"{sourcePath}\" -vf \"{vfFilter}\" -update 1 -frames:v 1 -q:v 2 \"{tempOutPath}\" -y"
                : $"-i \"{sourcePath}\" -vf \"{vfFilter}\" -update 1 -frames:v 1 -q:v 2 \"{tempOutPath}\" -y";

            var processInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process != null)
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(10));

                await process.WaitForExitAsync(cts.Token);

                if (process.ExitCode == 0 && File.Exists(tempOutPath))
                {
                    var bytes = await File.ReadAllBytesAsync(tempOutPath, cancellationToken);
                    if (bytes.Length > 0)
                    {
                        return (bytes, "image/jpeg");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "FFmpeg smoothed thumbnail generation not available or failed for {Path}.", sourcePath);
        }
        finally
        {
            if (File.Exists(tempOutPath))
            {
                try { File.Delete(tempOutPath); } catch { }
            }
        }

        return null;
    }

    private static async Task<(byte[] Bytes, string ContentType)?> GenerateSkiaSharpThumbnailAsync(
        string sourcePath,
        int targetWidth,
        int targetHeight,
        CancellationToken cancellationToken)
    {
        return await Task.Run<(byte[] Bytes, string ContentType)?>(() =>
        {
            try
            {
                SKBitmap? originalBitmap = null;
                SKEncodedOrigin origin = SKEncodedOrigin.TopLeft;

                // Try codec first
                try
                {
                    using var codec = SKCodec.Create(sourcePath);
                    if (codec != null)
                    {
                        origin = codec.EncodedOrigin;
                        originalBitmap = SKBitmap.Decode(codec);
                    }
                }
                catch
                {
                    // Ignore and try standard decode
                }

                // Fallback to standard decode
                if (originalBitmap == null)
                {
                    using var stream = File.OpenRead(sourcePath);
                    originalBitmap = SKBitmap.Decode(stream);
                }

                if (originalBitmap == null)
                    return null;

                using (originalBitmap)
                {
                    var oriented = ApplyOrientation(originalBitmap, origin);
                    using (oriented)
                    {
                        // Calculate scaled dimensions maintaining aspect ratio
                        float scale = Math.Min((float)targetWidth / oriented.Width, (float)targetHeight / oriented.Height);
                        int destWidth = Math.Max(1, (int)(oriented.Width * scale));
                        int destHeight = Math.Max(1, (int)(oriented.Height * scale));

                        var imageInfo = new SKImageInfo(destWidth, destHeight, SKColorType.Rgba8888, SKAlphaType.Premul);
                        using var resizedBitmap = oriented.Resize(imageInfo, new SKSamplingOptions(SKCubicResampler.CatmullRom));

                        if (resizedBitmap == null)
                            return null;

                        using var image = SKImage.FromBitmap(resizedBitmap);

                        // Try WebP first
                        using var webpData = image.Encode(SKEncodedImageFormat.Webp, 85);
                        if (webpData != null && webpData.Size > 0)
                        {
                            return (webpData.ToArray(), "image/webp");
                        }

                        // Fallback to JPEG
                        using var jpegData = image.Encode(SKEncodedImageFormat.Jpeg, 90);
                        if (jpegData != null && jpegData.Size > 0)
                        {
                            return (jpegData.ToArray(), "image/jpeg");
                        }

                        return null;
                    }
                }
            }
            catch
            {
                return null;
            }
        }, cancellationToken);
    }

    private static SKBitmap ApplyOrientation(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        return origin switch
        {
            SKEncodedOrigin.BottomRight => RotateBitmap(bitmap, 180),
            SKEncodedOrigin.RightTop => RotateBitmap(bitmap, 90),
            SKEncodedOrigin.LeftBottom => RotateBitmap(bitmap, 270),
            _ => bitmap
        };
    }

    private static SKBitmap RotateBitmap(SKBitmap bitmap, int degrees)
    {
        var isSwap = degrees == 90 || degrees == 270;
        var rotated = new SKBitmap(
            isSwap ? bitmap.Height : bitmap.Width,
            isSwap ? bitmap.Width : bitmap.Height);

        using var canvas = new SKCanvas(rotated);
        canvas.Translate(rotated.Width / 2f, rotated.Height / 2f);
        canvas.RotateDegrees(degrees);
        canvas.Translate(-bitmap.Width / 2f, -bitmap.Height / 2f);
        canvas.DrawBitmap(bitmap, 0, 0, SKSamplingOptions.Default, null);

        return rotated;
    }

    private static string ComputeCacheKey(int datasetId, string relativePath, string? snapshotName, long ticks, int width, int height)
    {
        var raw = $"{datasetId}:{relativePath}:{snapshotName ?? ""}:{ticks}:{width}x{height}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static bool IsImage(string ext) => ext switch
    {
        ".jpg" or ".jpeg" or ".png" or ".webp" or ".bmp" or ".gif" or ".ico" or ".tiff" or ".tif" => true,
        _ => false
    };

    private static bool IsVideo(string ext) => ext switch
    {
        ".mp4" or ".mkv" or ".webm" or ".mov" or ".avi" or ".flv" or ".wmv" or ".m4v" => true,
        _ => false
    };
}
