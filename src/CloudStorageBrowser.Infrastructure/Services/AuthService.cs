using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace CloudStorageBrowser.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly JwtTokenService _jwtService;

    public AuthService(AppDbContext context, JwtTokenService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<LoginResponseDto?> AuthenticateAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower(), cancellationToken);

        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        {
            return null;
        }

        user.LastLoginAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var token = GenerateJwtToken(user);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresInDays = JwtTokenService.ExpirationDays,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Role = user.Role,
                LastLoginAtUtc = user.LastLoginAtUtc
            }
        };
    }

    public Task<UserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        return GetCurrentUserAsync(userId, null, cancellationToken);
    }

    public async Task<UserDto?> GetCurrentUserAsync(int? userId, string? username, CancellationToken cancellationToken = default)
    {
        User? user = null;
        if (userId.HasValue && userId.Value > 0)
        {
            user = await _context.Users.FindAsync(new object[] { userId.Value }, cancellationToken);
        }

        if (user == null && !string.IsNullOrEmpty(username))
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower(), cancellationToken);
        }

        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role,
            LastLoginAtUtc = user.LastLoginAtUtc
        };
    }

    public Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        return ChangePasswordAsync(userId, null, currentPassword, newPassword, cancellationToken);
    }

    public async Task<bool> ChangePasswordAsync(int? userId, string? username, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        User? user = null;
        if (userId.HasValue && userId.Value > 0)
        {
            user = await _context.Users.FindAsync(new object[] { userId.Value }, cancellationToken);
        }

        if (user == null && !string.IsNullOrEmpty(username))
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower(), cancellationToken);
        }

        if (user == null) return false;

        if (!VerifyPassword(currentPassword, user.PasswordHash))
            return false;

        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public string HashPassword(string password) => PasswordHasher.Hash(password);

    public bool VerifyPassword(string password, string passwordHash) => PasswordHasher.Verify(password, passwordHash);

    public string GenerateJwtToken(User user) => _jwtService.GenerateToken(user);
}
