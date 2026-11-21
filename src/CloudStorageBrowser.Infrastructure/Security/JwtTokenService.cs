using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CloudStorageBrowser.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CloudStorageBrowser.Infrastructure.Security;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;
    private readonly byte[] _key;

    public const int ExpirationDays = 30;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
        var secret = _configuration["JWT_SECRET"]
                     ?? _configuration["Jwt:Secret"]
                     ?? "CloudStorageBrowser_SuperSecureDefaultKey_MustBeAtLeast32BytesLong!";

        // Ensure key is at least 32 bytes
        if (secret.Length < 32)
        {
            secret = secret.PadRight(32, '#');
        }

        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            }),
            Expires = DateTime.UtcNow.AddDays(ExpirationDays),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public TokenValidationParameters GetValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(_key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    }
}
