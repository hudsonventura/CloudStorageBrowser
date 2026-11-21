namespace CloudStorageBrowser.Infrastructure.Storage;

public static class PathSecurityHelper
{
    public static string GetSafeFullPath(string basePath, string relativePath)
    {
        basePath = Path.GetFullPath(basePath);

        // Remove any leading slashes or backslashes
        relativePath = (relativePath ?? string.Empty).TrimStart('/', '\\');

        var combined = Path.Combine(basePath, relativePath);
        var canonical = Path.GetFullPath(combined);

        // Security check: ensure canonical path begins with basePath
        if (!canonical.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Path traversal attempt detected.");
        }

        return canonical;
    }

    public static string NormalizeRelativePath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            return string.Empty;

        return relativePath.Replace('\\', '/').Trim('/');
    }
}
