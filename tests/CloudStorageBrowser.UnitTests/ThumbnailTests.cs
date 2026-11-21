using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Media;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class ThumbnailTests : IDisposable
{
    private readonly string _tempDir;
    private readonly ThumbnailService _service;
    private readonly DatasetConfig _dataset;

    public ThumbnailTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"thumb_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "CACHE_DIR", Path.Combine(_tempDir, "cache") }
            })
            .Build();

        _service = new ThumbnailService(config, NullLogger<ThumbnailService>.Instance);

        _dataset = new DatasetConfig
        {
            Id = 1,
            Name = "TestDataset",
            Path = Path.Combine(_tempDir, "dataset"),
            AccessMode = DatasetAccessMode.ReadWrite
        };
        Directory.CreateDirectory(_dataset.Path);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            try { Directory.Delete(_tempDir, recursive: true); } catch { }
        }
    }

    [Fact]
    public async Task GetOrCreateThumbnailAsync_GeneratesWebpThumbnail_ForValidImage()
    {
        // 1. Create a dummy test image (PNG)
        var imgPath = Path.Combine(_dataset.Path, "photo.png");
        using (var bitmap = new SKBitmap(800, 600))
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.CornflowerBlue);
            using (var paint = new SKPaint { Color = SKColors.White })
            {
                canvas.DrawRect(50, 50, 200, 200, paint);
            }
            using var img = SKImage.FromBitmap(bitmap);
            using var data = img.Encode(SKEncodedImageFormat.Png, 100);
            using var fileStream = File.OpenWrite(imgPath);
            data.SaveTo(fileStream);
        }

        // 2. Request thumbnail
        var result = await _service.GetOrCreateThumbnailAsync(_dataset, "photo.png", 200, 200);

        Assert.NotNull(result);
        Assert.Equal("image/webp", result.Value.ContentType);

        using var memoryStream = new MemoryStream();
        await result.Value.Stream.CopyToAsync(memoryStream);
        Assert.True(memoryStream.Length > 0);

        // Verify thumbnail dimensions
        memoryStream.Position = 0;
        using var thumbBitmap = SKBitmap.Decode(memoryStream);
        Assert.NotNull(thumbBitmap);
        Assert.True(thumbBitmap.Width <= 200);
        Assert.True(thumbBitmap.Height <= 200);
    }
}
