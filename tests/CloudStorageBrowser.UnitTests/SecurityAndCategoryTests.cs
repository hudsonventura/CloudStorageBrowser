using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Security;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class SecurityAndCategoryTests
{
    [Fact]
    public void PathSecurityHelper_AllowsValidRelativePath()
    {
        var baseDir = Path.GetTempPath();
        var safePath = PathSecurityHelper.GetSafeFullPath(baseDir, "subfolder/file.txt");
        Assert.StartsWith(Path.GetFullPath(baseDir), safePath);
    }

    [Fact]
    public void PathSecurityHelper_ThrowsOnPathTraversal()
    {
        var baseDir = Path.Combine(Path.GetTempPath(), "test_base");
        Directory.CreateDirectory(baseDir);

        Assert.Throws<UnauthorizedAccessException>(() =>
        {
            PathSecurityHelper.GetSafeFullPath(baseDir, "../../etc/shadow");
        });
    }

    [Theory]
    [InlineData(".jpg", FileCategory.Image)]
    [InlineData(".png", FileCategory.Image)]
    [InlineData(".webp", FileCategory.Image)]
    [InlineData(".mp4", FileCategory.Video)]
    [InlineData(".mkv", FileCategory.Video)]
    [InlineData(".mp3", FileCategory.Audio)]
    [InlineData(".pdf", FileCategory.Document)]
    [InlineData(".docx", FileCategory.Document)]
    [InlineData(".zip", FileCategory.Archive)]
    [InlineData(".cs", FileCategory.Code)]
    [InlineData(".ts", FileCategory.Code)]
    [InlineData(".txt", FileCategory.Text)]
    [InlineData(".bin", FileCategory.Other)]
    public void FileCategoryHelper_MapsCorrectly(string extension, FileCategory expected)
    {
        var result = FileCategoryHelper.GetCategory(extension);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void PasswordHasher_HashesAndVerifiesCorrectly()
    {
        var password = "SuperSecretPassword123!";
        var hash = PasswordHasher.Hash(password);

        Assert.True(PasswordHasher.Verify(password, hash));
        Assert.False(PasswordHasher.Verify("WrongPassword!", hash));
    }

    [Fact]
    public void JwtTokenService_GeneratesValidToken_With30DayExpiry()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "JWT_SECRET", "ThisIsASecretKeyWithMoreThan32CharactersForTesting!" }
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var jwtService = new JwtTokenService(config);

        var user = new User
        {
            Id = 42,
            Username = "admin",
            Role = UserRole.Admin
        };

        var token = jwtService.GenerateToken(user);
        Assert.NotNull(token);
        Assert.NotEmpty(token);

        var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = tokenHandler.ReadJwtToken(token);

        Assert.Equal("admin", jwt.Subject);
        var expectedMinExpiry = DateTime.UtcNow.AddDays(29);
        Assert.True(jwt.ValidTo > expectedMinExpiry);
    }
}
