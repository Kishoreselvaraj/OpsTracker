namespace Aetram_OPs_Track.Models.Entities;

/// <summary>Row shape for authentication lookup (Users table / auth SP).</summary>
public sealed class UserAuthRecord
{
    public int UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string? LastName { get; init; }
    public string Role { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string PasswordSalt { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}
