namespace Aetram_OPs_Track.Utilities;

/// <summary>
/// Central place for structured app logging (wraps <see cref="ILogger"/> patterns).
/// </summary>
public static class CommonLogs
{
    public static void LogInformation(ILogger logger, string message, params object[] args) =>
        logger.LogInformation(message, args);

    public static void LogWarning(ILogger logger, string message, params object[] args) =>
        logger.LogWarning(message, args);

    public static void LogError(ILogger logger, Exception ex, string message, params object[] args) =>
        logger.LogError(ex, message, args);
}
