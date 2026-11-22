using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MetadataController : ControllerBase
{
    private readonly IMetadataExtractorService _metadataService;
    private readonly IDatasetManager _datasetManager;

    public MetadataController(
        IMetadataExtractorService metadataService,
        IDatasetManager datasetManager)
    {
        _metadataService = metadataService;
        _datasetManager = datasetManager;
    }

    [HttpGet]
    public async Task<ActionResult<MediaMetadataDto?>> GetMetadata(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound();

        var metadata = await _metadataService.ExtractMetadataAsync(
            dataset, path, snapshotName, cancellationToken);

        if (metadata == null) return Ok(null);

        return Ok(new MediaMetadataDto
        {
            Format = metadata.Format,
            Duration = metadata.Duration,
            OverallBitrate = metadata.OverallBitrate,

            Width = metadata.Width,
            Height = metadata.Height,
            AspectRatio = metadata.AspectRatio,
            ColorType = metadata.ColorType,
            BitsPerPixel = metadata.BitsPerPixel,
            ColorCount = metadata.ColorCount,
            ColorSpace = metadata.ColorSpace,

            CameraMake = metadata.CameraMake,
            CameraModel = metadata.CameraModel,
            Lens = metadata.Lens,
            FNumber = metadata.FNumber,
            ExposureTime = metadata.ExposureTime,
            IsoSpeed = metadata.IsoSpeed,
            DateTaken = metadata.DateTaken,
            Software = metadata.Software,
            Latitude = metadata.Latitude,
            Longitude = metadata.Longitude,
            Altitude = metadata.Altitude,

            AudioCodec = metadata.AudioCodec,
            AudioBitrate = metadata.AudioBitrate,
            AudioSampleRate = metadata.AudioSampleRate,
            AudioChannels = metadata.AudioChannels,
            AudioChannelLayout = metadata.AudioChannelLayout,
            AudioBitrateMode = metadata.AudioBitrateMode,

            VideoCodec = metadata.VideoCodec,
            VideoProfile = metadata.VideoProfile,
            VideoBitrate = metadata.VideoBitrate,
            FrameRate = metadata.FrameRate,
            PixelFormat = metadata.PixelFormat
        });
    }
}
