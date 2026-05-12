using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Aetram_OPs_Track.Models.Response;

public sealed class AjaxAuthResponse
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? RedirectUrl { get; init; }
    public IReadOnlyDictionary<string, string[]>? Errors { get; init; }

    public static AjaxAuthResponse Ok(string redirectUrl) => new()
    {
        Success = true,
        RedirectUrl = redirectUrl
    };

    public static AjaxAuthResponse Fail(string message) => new()
    {
        Success = false,
        Message = message
    };

    public static AjaxAuthResponse InvalidModel(ModelStateDictionary modelState) => new()
    {
        Success = false,
        Message = "Please correct the highlighted fields.",
        Errors = modelState
            .Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(
                x => x.Key,
                x => x.Value!.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage).ToArray())
    };
}
