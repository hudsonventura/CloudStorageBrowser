using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Domain.ValueObjects;

public class StorageItem
{
    public string Name { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty;
    public ItemType Type { get; set; }
    public long Size { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime LastModifiedAtUtc { get; set; }
    public string Extension { get; set; } = string.Empty;
    public FileCategory Category { get; set; }
    public bool IsReadOnly { get; set; }
    public bool HasShadowCopy { get; set; }
    public int? SubitemsCount { get; set; }
    public int? FilesCount { get; set; }
    public int? DirectoriesCount { get; set; }
    public bool IsCalculatingStats { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public long? DimensionsArea => (Width.HasValue && Height.HasValue) ? (long)Width.Value * Height.Value : null;
}
