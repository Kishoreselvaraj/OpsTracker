using Microsoft.AspNetCore.Mvc;
using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;
using Aetram_OPs_Track.Services.Authentication;
using Aetram_OPs_Track.Services.Registration;

namespace Aetram_OPs_Track.Controllers;

public class RegisterController : BaseController
{
    private readonly IAuthenticationService _authentication;
    private readonly IRegistrationService _registration;

    public RegisterController(IAuthenticationService authentication, IRegistrationService registration)
    {
        _authentication = authentication;
        _registration = registration;
    }

    [HttpGet]
    public IActionResult Index()
    {
        if (_authentication.IsAuthenticated(HttpContext))
            return RedirectToAction("Index", "Dashboard");

        return View(new RegisterRequest());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Submit([FromForm] RegisterRequest model, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return Json(AjaxAuthResponse.InvalidModel(ModelState));

        var result = await _registration.RegisterAsync(model, cancellationToken).ConfigureAwait(false);
        return Json(result);
    }
}
