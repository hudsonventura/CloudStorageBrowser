using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.Common.Models;
using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly IDatasetManager _datasetManager;
    private readonly IFolderStatsService _folderStatsService;

    public FilesController(
        IStorageService storageService,
        IDatasetManager datasetManager,
        IFolderStatsService folderStatsService)
    {
        _storageService = storageService;
        _datasetManager = datasetManager;
        _folderStatsService = folderStatsService;
    }

    [HttpGet("browse")]
    public async Task<ActionResult<DirectoryListingDto>> Browse(
        [FromQuery] int datasetId,
        [FromQuery] string? path,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        [FromQuery] SortField sortBy = SortField.Name,
        [FromQuery] SortDirection sortDirection = SortDirection.Ascending,
        [FromQuery] string? search = null,
        [FromQuery] string? snapshotName = null,
        [FromQuery] bool showHidden = false,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null)
            return NotFound(new { message = $"Dataset with ID {datasetId} not found." });

        var pagination = new PaginationParams
        {
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortDirection = sortDirection,
            Search = search,
            ShowHidden = showHidden
        };

        var cleanPath = path ?? string.Empty;
        var pagedResult = await _storageService.ListDirectoryAsync(
            dataset, cleanPath, pagination, snapshotName, cancellationToken);

        var itemDtos = pagedResult.Items.Select(item => new FileItemDto
        {
            Name = item.Name,
            RelativePath = item.RelativePath,
            Type = item.Type,
            Size = item.Size,
            CreatedAtUtc = item.CreatedAtUtc,
            LastModifiedAtUtc = item.LastModifiedAtUtc,
            Extension = item.Extension,
            Category = item.Category,
            IsReadOnly = item.IsReadOnly,
            HasShadowCopy = item.HasShadowCopy,
            HasThumbnail = item.Category == FileCategory.Image || item.Category == FileCategory.Video,
            SubitemsCount = item.SubitemsCount,
            FilesCount = item.FilesCount,
            DirectoriesCount = item.DirectoriesCount,
            IsCalculatingStats = item.IsCalculatingStats,
            Width = item.Width,
            Height = item.Height
        }).ToList();

        // Also fetch or queue stats for current directory
        var currentStats = await _folderStatsService.GetFolderStatsAsync(
            dataset.Id, cleanPath, snapshotName, queueIfMissing: true, cancellationToken);

        var response = new DirectoryListingDto
        {
            CurrentPath = cleanPath,
            SnapshotName = snapshotName,
            IsReadOnly = dataset.AccessMode == DatasetAccessMode.ReadOnly || !string.IsNullOrEmpty(snapshotName),
            HasShadowCopy = dataset.AccessMode == DatasetAccessMode.ReadWrite, // HasShadowCopy set via items
            ShowHidden = showHidden,
            Items = itemDtos,
            Page = pagedResult.Page,
            PageSize = pagedResult.PageSize,
            TotalItems = pagedResult.TotalItems,
            TotalPages = pagedResult.TotalPages,
            CurrentFolderStats = currentStats
        };

        return Ok(response);
    }

    [HttpGet("folder-stats")]
    public async Task<ActionResult<FolderStatsDto>> GetFolderStats(
        [FromQuery] int datasetId,
        [FromQuery] string? path,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var stats = await _folderStatsService.GetFolderStatsAsync(
            datasetId, path ?? string.Empty, snapshotName, queueIfMissing: true, cancellationToken);

        if (stats == null)
        {
            return Ok(new FolderStatsDto
            {
                DatasetId = datasetId,
                RelativePath = path ?? string.Empty,
                SnapshotName = snapshotName,
                IsCalculating = true
            });
        }

        return Ok(stats);
    }

    [HttpGet("folder-stats-batch")]
    public async Task<ActionResult<Dictionary<string, FolderStatsDto>>> GetFolderStatsBatch(
        [FromQuery] int datasetId,
        [FromQuery] string[] paths,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _folderStatsService.GetBatchFolderStatsAsync(
            datasetId, paths ?? Array.Empty<string>(), snapshotName, queueIfMissing: true, cancellationToken);

        return Ok(result);
    }

    [HttpGet("raw")]
    public async Task<IActionResult> GetRaw(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound();

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";

        var (stream, contentType, fileName) = await _storageService.OpenReadAsync(
            dataset, path, snapshotName, cancellationToken);

        return File(stream, contentType, enableRangeProcessing: true);
    }

    [HttpGet("download")]
    public async Task<IActionResult> Download(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound();

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";

        var (stream, contentType, fileName) = await _storageService.OpenReadAsync(
            dataset, path, snapshotName, cancellationToken);

        return File(stream, contentType, fileName, enableRangeProcessing: true);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10L * 1024 * 1024 * 1024)] // 10 GB
    public async Task<IActionResult> Upload(
        [FromForm] int datasetId,
        [FromForm] string? targetPath,
        [FromForm] string? directory,
        [FromForm] List<IFormFile>? files,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        if (dataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot upload to a Read-Only dataset." });

        var effectivePath = !string.IsNullOrEmpty(targetPath) ? targetPath : (directory ?? string.Empty);

        var fileList = new List<IFormFile>();
        if (files != null && files.Count > 0)
        {
            fileList.AddRange(files);
        }
        if (file != null && !fileList.Contains(file))
        {
            fileList.Add(file);
        }
        if (fileList.Count == 0 && Request.HasFormContentType && Request.Form.Files.Count > 0)
        {
            fileList.AddRange(Request.Form.Files);
        }

        if (fileList.Count == 0)
        {
            return BadRequest(new { message = "Nenhum arquivo enviado para upload." });
        }

        var uploadedCount = 0;
        foreach (var item in fileList)
        {
            if (item.Length == 0) continue;

            var relativePath = string.IsNullOrEmpty(effectivePath)
                ? item.FileName
                : $"{effectivePath}/{item.FileName}";

            await using var stream = item.OpenReadStream();
            await _storageService.WriteFileAsync(dataset, relativePath, stream, overwrite: true, cancellationToken);
            uploadedCount++;
        }

        if (_folderStatsService != null)
        {
            await _folderStatsService.InvalidateAndRecalculateAncestorsAsync(dataset.Id, effectivePath, cancellationToken);
        }

        return Ok(new { message = $"{uploadedCount} files uploaded successfully.", count = uploadedCount });
    }

    [HttpPost("create-folder")]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderDto dto, CancellationToken cancellationToken)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        if (dataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot create folder in a Read-Only dataset." });

        var cleanParent = dto.ParentPath ?? string.Empty;
        var folderPath = string.IsNullOrEmpty(cleanParent)
            ? dto.FolderName
            : $"{cleanParent}/{dto.FolderName}";

        await _storageService.CreateDirectoryAsync(dataset, folderPath, cancellationToken);
        return Ok(new { message = "Folder created successfully." });
    }

    [HttpPost("rename")]
    public async Task<IActionResult> Rename([FromBody] RenameItemDto dto, CancellationToken cancellationToken)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        if (dataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot rename in a Read-Only dataset." });

        await _storageService.RenameItemAsync(dataset, dto.RelativePath, dto.NewName, cancellationToken);
        return Ok(new { message = "Item renamed successfully." });
    }

    [HttpPost("move")]
    public async Task<IActionResult> Move([FromBody] MoveCopyItemDto dto, CancellationToken cancellationToken)
    {
        var sourceDataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (sourceDataset == null) return NotFound(new { message = "Source dataset not found." });

        var targetDatasetId = dto.TargetDatasetId ?? dto.DatasetId;
        var targetDataset = (targetDatasetId == dto.DatasetId)
            ? sourceDataset
            : await _datasetManager.GetDatasetByIdAsync(targetDatasetId, cancellationToken);

        if (targetDataset == null) return NotFound(new { message = "Target dataset not found." });

        if (sourceDataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot move items from a Read-Only dataset." });

        if (targetDataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot move items into a Read-Only dataset." });

        var fileName = Path.GetFileName(dto.SourcePath);
        var targetPath = string.IsNullOrEmpty(dto.TargetDirectory)
            ? fileName
            : $"{dto.TargetDirectory}/{fileName}";

        await _storageService.MoveItemAsync(sourceDataset, dto.SourcePath, targetDataset, targetPath, cancellationToken);
        return Ok(new { message = "Item moved successfully." });
    }

    [HttpPost("copy")]
    public async Task<IActionResult> Copy([FromBody] MoveCopyItemDto dto, CancellationToken cancellationToken)
    {
        var sourceDataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (sourceDataset == null) return NotFound(new { message = "Source dataset not found." });

        var targetDatasetId = dto.TargetDatasetId ?? dto.DatasetId;
        var targetDataset = (targetDatasetId == dto.DatasetId)
            ? sourceDataset
            : await _datasetManager.GetDatasetByIdAsync(targetDatasetId, cancellationToken);

        if (targetDataset == null) return NotFound(new { message = "Target dataset not found." });

        if (targetDataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot copy items into a Read-Only dataset." });

        var fileName = Path.GetFileName(dto.SourcePath);
        var targetPath = string.IsNullOrEmpty(dto.TargetDirectory)
            ? fileName
            : $"{dto.TargetDirectory}/{fileName}";

        await _storageService.CopyItemAsync(sourceDataset, dto.SourcePath, targetDataset, targetPath, cancellationToken);
        return Ok(new { message = "Item copied successfully." });
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteItemDto dto, CancellationToken cancellationToken)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (dataset == null) return NotFound(new { message = "Dataset not found." });

        if (dataset.AccessMode == DatasetAccessMode.ReadOnly)
            return StatusCode(403, new { message = "Cannot delete items in a Read-Only dataset." });

        await _storageService.DeleteItemAsync(dataset, dto.RelativePath, cancellationToken);
        return Ok(new { message = "Item deleted successfully." });
    }

    [HttpGet("content")]
    public async Task<ActionResult<TextContentDto>> GetContent(
        [FromQuery] int datasetId,
        [FromQuery] string path,
        [FromQuery] string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(datasetId, cancellationToken);
        if (dataset == null) return NotFound();

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";

        var content = await _storageService.ReadTextContentAsync(dataset, path, snapshotName, cancellationToken);
        return Ok(new TextContentDto
        {
            DatasetId = datasetId,
            RelativePath = path,
            Content = content,
            SnapshotName = snapshotName
        });
    }

    [HttpPut("content")]
    public async Task<IActionResult> SaveContent([FromBody] TextContentDto dto, CancellationToken cancellationToken)
    {
        var dataset = await _datasetManager.GetDatasetByIdAsync(dto.DatasetId, cancellationToken);
        if (dataset == null) return NotFound();

        if (dataset.AccessMode == DatasetAccessMode.ReadOnly || !string.IsNullOrEmpty(dto.SnapshotName))
            return StatusCode(403, new { message = "Cannot save changes to a Read-Only dataset or snapshot." });

        await _storageService.SaveTextContentAsync(dataset, dto.RelativePath, dto.Content, cancellationToken);
        return Ok(new { message = "File content saved successfully." });
    }
}
