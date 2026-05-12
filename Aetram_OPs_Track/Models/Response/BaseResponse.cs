namespace Aetram_OPs_Track.Models.Response;

public abstract class BaseResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}
