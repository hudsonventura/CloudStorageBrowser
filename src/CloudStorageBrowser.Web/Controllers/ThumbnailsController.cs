using CloudStorageBrowser.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ThumbnailsController : ControllerBase
{
    private readonly IThumbnailService _thumbnailService;
    private readonly IDatasetManager _datasetManager;

    public ThumbnailsController(
        IThumbnailService thumbnailService,
        IDatasetManager datasetManager)
    {
        _thumbnailService = thumbnailService;
        _datasetManager = datasetManager;
    }

    [HttpGet("{datasetId}")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Client)]
    public async Task<IActionResult> GetThumbnail(
        [FromRoute] int datasetId,
        [FromQuery] string path,
        [FromQuery] int width = 320,
        [FromQuery] int height = 320,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound();

        var result = await _thumbnailService.GetOrCreateThumbnailAsync(
            dataset, path, width, height, snapshotName, cancellationToken);

        if (result == null)
        {
            return NotFound();
        }

        return File(result.Value.Stream, result.Value.ContentType);
    }
}
