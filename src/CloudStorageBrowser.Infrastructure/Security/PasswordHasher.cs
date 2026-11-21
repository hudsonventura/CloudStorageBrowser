using System.Security.Cryptography;
using System.Text;

namespace CloudStorageBrowser.Infrastructure.Security;

public static class PasswordHasher
{
    // Salt concatenated with the password
    private const string Salt = "CSB_Salt_TrueNAS#2026_SecureKey!";

    public static string Hash(string password)
    {
        // Concatenate password and salt
        var combined = $"{password}:{Salt}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(combined));

        // Save ONLY the hash in the database
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public static bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(passwordHash))
            return false;

        // Verify with concatenated salt hash
        var combined = $"{password}:{Salt}";
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(combined))).ToLowerInvariant();

        if (string.Equals(expectedHash, passwordHash, StringComparison.OrdinalIgnoreCase))
            return true;

        // Backward compatibility for legacy PBKDF2 format if user was previously seeded
        if (passwordHash.Contains('.'))
        {
            try
            {
                var parts = passwordHash.Split('.');
                if (parts.Length == 2)
                {
                    byte[] saltBytes = Convert.FromBase64String(parts[0]);
                    byte[] exp = Convert.FromBase64String(parts[1]);
                    byte[] actual = Rfc2898DeriveBytes.Pbkdf2(password, saltBytes, 100_000, HashAlgorithmName.SHA256, 32);
                    return CryptographicOperations.FixedTimeEquals(exp, actual);
                }
            }
            catch
            {
                return false;
            }
        }

        return false;
    }
}
