using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DatasetsController : ControllerBase
{
    private readonly IDatasetManager _datasetManager;

    public DatasetsController(IDatasetManager datasetManager)
    {
        _datasetManager = datasetManager;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DatasetDto>>> GetDatasets(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        var datasets = await _datasetManager.GetAllDatasetsAsync(cancellationToken);
        return Ok(datasets);
    }

    [HttpPost("rescan")]
    public async Task<IActionResult> Rescan(CancellationToken cancellationToken)
    {
        await _datasetManager.RescanDatasetsAsync(cancellationToken);
        var datasets = await _datasetManager.GetAllDatasetsAsync(cancellationToken);
        return Ok(datasets);
    }
}
