using Microsoft.AspNetCore.Mvc;

namespace OpsTracker_v1.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Dashboard() => View("~/Views/Admin/Dashboard.cshtml");
        public IActionResult Organizations() => View("~/Views/Admin/Organizations.cshtml");
        public IActionResult Users() => View("~/Views/Admin/Users.cshtml");
        public IActionResult Settings() => View("~/Views/Admin/Settings.cshtml");
    }
}
