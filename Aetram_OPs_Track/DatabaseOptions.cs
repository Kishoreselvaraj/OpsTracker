namespace Aetram_OPs_Track;

/// <summary>
/// Binds SQL Server connection settings from appsettings.json (ConnectionStrings section).
/// </summary>
public sealed class DatabaseOptions
{
    public const string SectionName = "ConnectionStrings";

    public string DefaultConnection { get; set; } = string.Empty;
}
