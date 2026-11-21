using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Infrastructure.Storage;

public static class FileCategoryHelper
{
    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff", ".tif", ".heic", ".avif"
    };

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".mkv", ".webm", ".mov", ".avi", ".flv", ".wmv", ".m4v"
    };

    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".wma", ".opus"
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".rtf", ".epub"
    };

    private static readonly HashSet<string> ArchiveExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar", ".iso"
    };

    private static readonly HashSet<string> CodeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml",
        ".py", ".sh", ".bash", ".sql", ".go", ".rs", ".cpp", ".c", ".h", ".java", ".php", ".rb"
    };

    private static readonly HashSet<string> TextExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".md", ".log", ".csv", ".ini", ".conf", ".env", ".cfg"
    };

    public static FileCategory GetCategory(string extension)
    {
        if (string.IsNullOrEmpty(extension))
            return FileCategory.Other;

        if (ImageExtensions.Contains(extension)) return FileCategory.Image;
        if (VideoExtensions.Contains(extension)) return FileCategory.Video;
        if (AudioExtensions.Contains(extension)) return FileCategory.Audio;
        if (DocumentExtensions.Contains(extension)) return FileCategory.Document;
        if (ArchiveExtensions.Contains(extension)) return FileCategory.Archive;
        if (CodeExtensions.Contains(extension)) return FileCategory.Code;
        if (TextExtensions.Contains(extension)) return FileCategory.Text;

        return FileCategory.Other;
    }
}
