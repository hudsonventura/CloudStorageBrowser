using System.Security.Claims;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorageBrowser.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var result = await _authService.AuthenticateAsync(request, cancellationToken);
        if (result == null)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        // Set HttpOnly cookie for seamless media, video, audio and thumbnail requests
        Response.Cookies.Append("csb_token", result.Token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,
            Expires = DateTimeOffset.UtcNow.AddDays(30),
            Path = "/"
        });

        return Ok(result);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("csb_token");
        return Ok(new { message = "Logged out successfully." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken cancellationToken)
    {
        var (userId, username) = GetUserIdentity();
        if (!userId.HasValue && string.IsNullOrEmpty(username))
        {
            return Unauthorized();
        }

        var user = await _authService.GetCurrentUserAsync(userId, username, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(user);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
    {
        var (userId, username) = GetUserIdentity();
        if (!userId.HasValue && string.IsNullOrEmpty(username))
        {
            return Unauthorized(new { message = "Sessão inválida ou expirada. Faça login novamente." });
        }

        var success = await _authService.ChangePasswordAsync(userId, username, dto.CurrentPassword, dto.NewPassword, cancellationToken);
        if (!success)
        {
            return BadRequest(new { message = "Senha atual incorreta." });
        }

        // Issue refreshed token
        var userDto = await _authService.GetCurrentUserAsync(userId, username, cancellationToken);
        string? newToken = null;
        if (userDto != null)
        {
            var userEntity = new CloudStorageBrowser.Domain.Entities.User
            {
                Id = userDto.Id,
                Username = userDto.Username,
                Role = userDto.Role
            };
            newToken = _authService.GenerateJwtToken(userEntity);
            Response.Cookies.Append("csb_token", newToken, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTimeOffset.UtcNow.AddDays(30),
                Path = "/"
            });
        }

        return Ok(new { message = "Senha atualizada com sucesso.", token = newToken });
    }

    private (int? UserId, string? Username) GetUserIdentity()
    {
        int? userId = null;
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("nameid")?.Value
                      ?? User.FindFirst("sub")?.Value;

        if (!string.IsNullOrEmpty(idClaim) && int.TryParse(idClaim, out var parsedId))
        {
            userId = parsedId;
        }

        var username = User.Identity?.Name
                       ?? User.FindFirst(ClaimTypes.Name)?.Value
                       ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
                       ?? User.FindFirst("sub")?.Value;

        return (userId, username);
    }
}
