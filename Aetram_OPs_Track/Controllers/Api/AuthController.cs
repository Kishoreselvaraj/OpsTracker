using Microsoft.AspNetCore.Mvc;
using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;
using Aetram_OPs_Track.Services.Authentication;
using Aetram_OPs_Track.Services.Registration;

namespace Aetram_OPs_Track.Controllers.Api;

/// <summary>
/// Attribute-routed REST surface so OpenAPI/Swagger lists operations (conventional MVC routes are often omitted from the spec).
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authentication;
    private readonly IRegistrationService _registration;

    public AuthController(IAuthenticationService authentication, IRegistrationService registration)
    {
        _authentication = authentication;
        _registration = registration;
    }

    /// <summary>JSON login for API clients and Swagger Try It Out; sets the same session as the MVC form login.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AjaxAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AjaxAuthResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AjaxAuthResponse>> Login(
        [FromBody] LoginRequest request,
        [FromQuery] string? returnUrl,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(AjaxAuthResponse.InvalidModel(ModelState));

        var result = await _authentication.SignInAsync(request, returnUrl, HttpContext, cancellationToken)
            .ConfigureAwait(false);

        return Ok(result);
    }

    /// <summary>Creates a new user (MEMBER role); password stored as PBKDF2 hash only.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AjaxAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AjaxAuthResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AjaxAuthResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(AjaxAuthResponse.InvalidModel(ModelState));

        var result = await _registration.RegisterAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    /// <summary>Clears authentication session.</summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        _authentication.SignOut(HttpContext);
        return NoContent();
    }
}
