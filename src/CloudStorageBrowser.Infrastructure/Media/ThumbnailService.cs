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
            var cacheFilePath = Path.Combine(_cacheDirectory, $"{cacheKey}.webp");

            // If thumbnail already exists on disk, serve it directly
            if (File.Exists(cacheFilePath))
            {
                var cachedStream = new FileStream(cacheFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                return (cachedStream, "image/webp");
            }

            // On-demand generation: if cache was lost or doesn't exist yet, reconstruct it dynamically!
            byte[]? generatedBytes = null;

            if (IsImage(ext))
            {
                generatedBytes = await GenerateImageThumbnailAsync(sourcePath, width, height, cancellationToken);
            }
            else if (IsVideo(ext))
            {
                generatedBytes = await GenerateVideoThumbnailAsync(sourcePath, width, height, cancellationToken);
            }

            if (generatedBytes != null && generatedBytes.Length > 0)
            {
                // Save to cache directory asynchronously
                await File.WriteAllBytesAsync(cacheFilePath, generatedBytes, cancellationToken);

                var stream = new MemoryStream(generatedBytes);
                return (stream, "image/webp");
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not generate thumbnail for {Dataset}/{Path}", dataset.Name, relativePath);
            return null;
        }
    }

    private static async Task<byte[]?> GenerateImageThumbnailAsync(
        string sourcePath,
        int targetWidth,
        int targetHeight,
        CancellationToken cancellationToken)
    {
        return await Task.Run(() =>
        {
            using var inputStream = File.OpenRead(sourcePath);
            using var originalBitmap = SKBitmap.Decode(inputStream);

            if (originalBitmap == null)
                return null;

            // Calculate scaled dimensions maintaining aspect ratio
            float scale = Math.Min((float)targetWidth / originalBitmap.Width, (float)targetHeight / originalBitmap.Height);
            int destWidth = Math.Max(1, (int)(originalBitmap.Width * scale));
            int destHeight = Math.Max(1, (int)(originalBitmap.Height * scale));

            var imageInfo = new SKImageInfo(destWidth, destHeight, SKColorType.Rgba8888, SKAlphaType.Premul);
            using var resizedBitmap = originalBitmap.Resize(imageInfo, SKSamplingOptions.Default);

            if (resizedBitmap == null)
                return null;

            using var image = SKImage.FromBitmap(resizedBitmap);
            using var data = image.Encode(SKEncodedImageFormat.Webp, 85);

            return data.ToArray();
        }, cancellationToken);
    }

    private async Task<byte[]?> GenerateVideoThumbnailAsync(
        string sourcePath,
        int targetWidth,
        int targetHeight,
        CancellationToken cancellationToken)
    {
        // Try ffmpeg to extract video frame at 00:00:01
        var tempFramePath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.jpg");

        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = $"-ss 00:00:01 -i \"{sourcePath}\" -vframes 1 -q:v 2 \"{tempFramePath}\" -y",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process != null)
            {
                await process.WaitForExitAsync(cancellationToken);

                if (File.Exists(tempFramePath))
                {
                    var result = await GenerateImageThumbnailAsync(tempFramePath, targetWidth, targetHeight, cancellationToken);
                    return result;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ffmpeg not available or failed for video thumbnail.");
        }
        finally
        {
            if (File.Exists(tempFramePath))
            {
                try { File.Delete(tempFramePath); } catch { }
            }
        }

        return null;
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
