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
            Width = metadata.Width,
            Height = metadata.Height,
            Duration = metadata.Duration,
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
            Altitude = metadata.Altitude
        });
    }
}
