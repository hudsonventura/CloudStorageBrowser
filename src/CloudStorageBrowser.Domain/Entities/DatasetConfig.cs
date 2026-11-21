using CloudStorageBrowser.Domain.Common;
using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Domain.Entities;

public class DatasetConfig : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DatasetAccessMode AccessMode { get; set; } = DatasetAccessMode.ReadWrite;
    public string? Description { get; set; }
    public bool IsVisible { get; set; } = true;
}
