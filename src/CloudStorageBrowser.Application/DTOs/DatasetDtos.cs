using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Application.DTOs;

public class DatasetDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DatasetAccessMode AccessMode { get; set; }
    public string? Description { get; set; }
    public bool HasShadowCopy { get; set; }
    public long TotalBytes { get; set; }
    public long FreeBytes { get; set; }
    public long UsedBytes { get; set; }
    public double UsedPercentage { get; set; }
}

public class CreateDatasetDto
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DatasetAccessMode AccessMode { get; set; } = DatasetAccessMode.ReadWrite;
    public string? Description { get; set; }
}

public class UpdateDatasetDto
{
    public string Name { get; set; } = string.Empty;
    public DatasetAccessMode AccessMode { get; set; }
    public string? Description { get; set; }
}
