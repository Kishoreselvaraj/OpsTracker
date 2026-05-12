using Microsoft.AspNetCore.Mvc;
using Aetram_OPs_Track.Filters;
using Aetram_OPs_Track.Infrastructure;

namespace Aetram_OPs_Track.Controllers;

[RequireAuthenticatedSession]
public class DashboardController : BaseController
{
    public IActionResult Index()
    {
        ViewBag.DisplayName = HttpContext.Session.GetString(SessionKeys.DisplayName);
        ViewBag.Role = HttpContext.Session.GetString(SessionKeys.Role);
        return View();
    }
}
