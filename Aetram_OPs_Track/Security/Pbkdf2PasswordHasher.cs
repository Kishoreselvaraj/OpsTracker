using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace Aetram_OPs_Track.Security;

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private readonly AuthenticationOptions _options;

    public Pbkdf2PasswordHasher(IOptionsSnapshot<AuthenticationOptions> options) =>
        _options = options.Value;

    public PasswordHashMaterial Hash(string plaintextPassword)
    {
        ArgumentException.ThrowIfNullOrEmpty(plaintextPassword);

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            plaintextPassword,
            salt,
            _options.Pbkdf2Iterations,
            HashAlgorithmName.SHA256,
            _options.Pbkdf2KeyBytes);

        return new PasswordHashMaterial(
            Convert.ToBase64String(hash),
            Convert.ToBase64String(salt));
    }
}
