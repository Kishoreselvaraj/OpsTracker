using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;

namespace Aetram_OPs_Track.Services.Authentication;

/// <summary>Centralized sign-in / sign-out; coordinates data access, password verification, and session state.</summary>
public interface IAuthenticationService
{
    Task<AjaxAuthResponse> SignInAsync(
        LoginRequest request,
        string? returnUrl,
        HttpContext httpContext,
        CancellationToken cancellationToken = default);

    void SignOut(HttpContext httpContext);

    bool IsAuthenticated(HttpContext httpContext);
}
