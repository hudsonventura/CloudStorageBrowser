using CloudStorageBrowser.Domain.Common;
using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public DateTime? LastLoginAtUtc { get; set; }
}
