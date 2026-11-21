using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Application.DTOs;

public class FileItemDto
{
    public string Name { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
    public ItemType Type { get; set; }
    public long Size { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime LastModifiedAtUtc { get; set; }
    public string Extension { get; set; } = string.Empty;
    public FileCategory Category { get; set; }
    public bool IsReadOnly { get; set; }
    public bool HasShadowCopy { get; set; }
    public bool HasThumbnail { get; set; }
}

public class DirectoryListingDto
{
    public string CurrentPath { get; set; } = string.Empty;
    public string? SnapshotName { get; set; }
    public bool IsReadOnly { get; set; }
    public bool HasShadowCopy { get; set; }
    public IReadOnlyList<FileItemDto> Items { get; set; } = Array.Empty<FileItemDto>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public class CreateFolderDto
{
    public int DatasetId { get; set; }
    public string ParentPath { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty;
}

public class RenameItemDto
{
    public int DatasetId { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string NewName { get; set; } = string.Empty;
}

public class MoveCopyItemDto
{
    public int DatasetId { get; set; }
    public string SourcePath { get; set; } = string.Empty;
    public string TargetDirectory { get; set; } = string.Empty;
}

public class DeleteItemDto
{
    public int DatasetId { get; set; }
    public string RelativePath { get; set; } = string.Empty;
}

public class TextContentDto
{
    public int DatasetId { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? SnapshotName { get; set; }
}
