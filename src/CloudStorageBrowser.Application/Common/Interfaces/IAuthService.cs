using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;

namespace CloudStorageBrowser.Application.Common.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> AuthenticateAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<UserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<UserDto?> GetCurrentUserAsync(int? userId, string? username, CancellationToken cancellationToken = default);
    Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
    Task<bool> ChangePasswordAsync(int? userId, string? username, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
    string GenerateJwtToken(User user);
}
