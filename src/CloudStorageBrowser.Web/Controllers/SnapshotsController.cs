using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SnapshotsController : ControllerBase
{
    private readonly ISnapshotService _snapshotService;
    private readonly IDatasetManager _datasetManager;

    public SnapshotsController(
        ISnapshotService snapshotService,
        IDatasetManager datasetManager)
    {
        _snapshotService = snapshotService;
        _datasetManager = datasetManager;
    }

    [HttpGet("versions")]
    public async Task<ActionResult<IReadOnlyList<SnapshotVersionDto>>> GetVersions(
        [FromQuery] int datasetId,
        [FromQuery] string? path,
        [FromQuery] bool onlyModified = true,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        var versions = await _snapshotService.GetVersionsAsync(
            dataset, path ?? string.Empty, onlyModified, cancellationToken);

        var dtos = versions.Select(v => new SnapshotVersionDto
        {
            SnapshotName = v.SnapshotName,
            Timestamp = v.Timestamp,
            RelativePath = v.RelativePath,
            Type = v.Type,
            Size = v.Size,
            LastModifiedAtUtc = v.LastModifiedAtUtc,
            ChangeStatus = v.ChangeStatus
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("download")]
    public async Task<IActionResult> DownloadSnapshotVersion(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string snapshotName,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";

        var (stream, contentType, fileName) = await _snapshotService.OpenSnapshotReadAsync(
            dataset, path, snapshotName, cancellationToken);

        return File(stream, contentType, fileName, enableRangeProcessing: true);
    }

    [HttpGet("raw")]
    public async Task<IActionResult> RawSnapshotVersion(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string snapshotName,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";

        var (stream, contentType, fileName) = await _snapshotService.OpenSnapshotReadAsync(
            dataset, path, snapshotName, cancellationToken);

        return File(stream, contentType, enableRangeProcessing: true);
    }
}
