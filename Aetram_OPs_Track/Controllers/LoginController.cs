using Microsoft.AspNetCore.Mvc;
using Aetram_OPs_Track.Infrastructure;
using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;
using Aetram_OPs_Track.Services.Authentication;

namespace Aetram_OPs_Track.Controllers;

public class LoginController : BaseController
{
    private readonly IAuthenticationService _authentication;

    public LoginController(IAuthenticationService authentication) =>
        _authentication = authentication;

    [HttpGet]
    public IActionResult Index(string? returnUrl = null)
    {
        if (_authentication.IsAuthenticated(HttpContext))
            return RedirectToAction("Index", "Dashboard");

        ViewBag.ReturnUrl = returnUrl;
        return View(new LoginRequest());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Validate(
        [FromForm] LoginRequest model,
        [FromForm] string? returnUrl,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return Json(AjaxAuthResponse.InvalidModel(ModelState));

        var result = await _authentication.SignInAsync(model, returnUrl, HttpContext, cancellationToken)
            .ConfigureAwait(false);
        return Json(result);
    }

    [HttpGet]
    public IActionResult Logout()
    {
        _authentication.SignOut(HttpContext);
        return RedirectToAction(nameof(Index));
    }
}
