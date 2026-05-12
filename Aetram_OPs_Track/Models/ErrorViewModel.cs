using System.Diagnostics;

namespace Aetram_OPs_Track.Models;

public class ErrorViewModel
{
    public string? RequestId { get; set; }

    public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);

    public string? Message { get; set; }

    public static ErrorViewModel FromActivity(string? message = null) => new()
    {
        RequestId = Activity.Current?.Id ?? null,
        Message = message
    };
}
