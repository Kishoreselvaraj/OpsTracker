namespace Aetram_OPs_Track;

public sealed class AuthenticationOptions
{
    public const string SectionName = "Authentication";

    /// <summary>Relative path after successful login when no returnUrl is provided.</summary>
    public string DefaultRedirectPath { get; set; } = "/Dashboard";

    /// <summary>Relative path after successful self-registration (typically login page).</summary>
    public string DefaultPostRegisterRedirectPath { get; set; } = "/Login";

    /// <summary>PBKDF2 iteration count (must match how passwords were stored).</summary>
    public int Pbkdf2Iterations { get; set; } = 100_000;

    /// <summary>Derived key length in bytes.</summary>
    public int Pbkdf2KeyBytes { get; set; } = 32;
}
