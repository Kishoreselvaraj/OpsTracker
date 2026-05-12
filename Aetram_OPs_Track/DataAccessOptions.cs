namespace Aetram_OPs_Track;

/// <summary>
/// Optional tuning for ADO.NET command behavior (not connection strings).
/// </summary>
public sealed class DataAccessOptions
{
    public const string SectionName = "DataAccess";

    /// <summary>ADO.NET command timeout in seconds (0 = provider default).</summary>
    public int CommandTimeoutSeconds { get; set; } = 30;
}
