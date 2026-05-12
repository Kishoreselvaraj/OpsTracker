namespace Aetram_OPs_Track.Security;

/// <summary>Verifies a plaintext password against stored hash material (never stores plaintext).</summary>
public interface IPasswordVerifier
{
    bool Verify(string plaintextPassword, string passwordHashBase64, string passwordSaltBase64);
}
