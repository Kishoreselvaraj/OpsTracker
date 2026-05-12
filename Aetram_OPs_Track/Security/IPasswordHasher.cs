namespace Aetram_OPs_Track.Security;

/// <summary>
/// Creates stored PasswordHash / PasswordSalt (Base64) compatible with <see cref="Pbkdf2PasswordVerifier"/>.
/// </summary>
public interface IPasswordHasher
{
    PasswordHashMaterial Hash(string plaintextPassword);
}

/// <param name="HashBase64">PBKDF2 derived key, Base64.</param>
/// <param name="SaltBase64">Random salt, Base64.</param>
public readonly record struct PasswordHashMaterial(string HashBase64, string SaltBase64);
