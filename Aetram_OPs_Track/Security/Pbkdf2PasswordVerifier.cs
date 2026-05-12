using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Aetram_OPs_Track;

namespace Aetram_OPs_Track.Security;

/// <summary>
/// PBKDF2-HMAC-SHA256 verification aligned with typical SQL-stored PasswordHash / PasswordSalt (Base64) columns.
/// </summary>
public sealed class Pbkdf2PasswordVerifier : IPasswordVerifier
{
    private readonly AuthenticationOptions _options;

    public Pbkdf2PasswordVerifier(IOptionsSnapshot<AuthenticationOptions> options) =>
        _options = options.Value;

    public bool Verify(string plaintextPassword, string passwordHashBase64, string passwordSaltBase64)
    {
        if (string.IsNullOrEmpty(plaintextPassword) ||
            string.IsNullOrWhiteSpace(passwordHashBase64) ||
            string.IsNullOrWhiteSpace(passwordSaltBase64))
            return false;

        byte[] salt;
        byte[] expected;
        try
        {
            salt = Convert.FromBase64String(passwordSaltBase64);
            expected = Convert.FromBase64String(passwordHashBase64);
        }
        catch (FormatException)
        {
            return false;
        }

        if (salt.Length == 0 || expected.Length == 0)
            return false;

        var actual = Rfc2898DeriveBytes.Pbkdf2(
            plaintextPassword,
            salt,
            _options.Pbkdf2Iterations,
            HashAlgorithmName.SHA256,
            _options.Pbkdf2KeyBytes);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
