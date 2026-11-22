using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Media;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class MetadataExtractorTests : IDisposable
{
    private readonly string _tempDir;
    private readonly MetadataExtractorService _service;
    private readonly DatasetConfig _dataset;

    public MetadataExtractorTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"meta_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _service = new MetadataExtractorService(NullLogger<MetadataExtractorService>.Instance);

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
    public async Task ExtractMetadataAsync_ReturnsImageProperties_ForPng()
    {
        var filePath = Path.Combine(_dataset.Path, "test_image.png");

        using (var bitmap = new SKBitmap(200, 100, SKColorType.Rgba8888, SKAlphaType.Premul))
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.CornflowerBlue);
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            using var stream = File.OpenWrite(filePath);
            data.SaveTo(stream);
        }

        var metadata = await _service.ExtractMetadataAsync(_dataset, "test_image.png");

        Assert.NotNull(metadata);
        Assert.Equal("PNG", metadata.Format);
        Assert.Equal(200, metadata.Width);
        Assert.Equal(100, metadata.Height);
        Assert.Equal("2:1", metadata.AspectRatio);
        Assert.NotNull(metadata.ColorType);
        Assert.NotNull(metadata.BitsPerPixel);
    }

    [Fact]
    public async Task ExtractMetadataAsync_ReturnsSvgProperties_ForSvg()
    {
        var filePath = Path.Combine(_dataset.Path, "vector.svg");
        var svgContent = @"<svg xmlns=""http://www.w3.org/2000/svg"" width=""800"" height=""600"" viewBox=""0 0 800 600"">
            <rect width=""800"" height=""600"" fill=""blue"" />
        </svg>";
        await File.WriteAllTextAsync(filePath, svgContent);

        var metadata = await _service.ExtractMetadataAsync(_dataset, "vector.svg");

        Assert.NotNull(metadata);
        Assert.Equal("SVG", metadata.Format);
        Assert.Equal(800, metadata.Width);
        Assert.Equal(600, metadata.Height);
        Assert.Equal("4:3", metadata.AspectRatio);
        Assert.Equal("Vetorial / SVG", metadata.ColorType);
    }

    [Fact]
    public async Task ExtractMetadataAsync_ReturnsNull_ForNonMediaFile()
    {
        var filePath = Path.Combine(_dataset.Path, "document.txt");
        await File.WriteAllTextAsync(filePath, "Hello World");

        var metadata = await _service.ExtractMetadataAsync(_dataset, "document.txt");

        Assert.Null(metadata);
    }

    [Fact]
    public async Task ExtractMetadataAsync_ReturnsNull_ForNonExistentFile()
    {
        var metadata = await _service.ExtractMetadataAsync(_dataset, "ghost.png");

        Assert.Null(metadata);
    }
}
