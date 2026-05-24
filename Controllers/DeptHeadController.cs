using Microsoft.AspNetCore.Mvc;

namespace OpsTracker_v1.Controllers
{
    public class DeptHeadController : Controller
    {
        public IActionResult Dashboard() => View("~/Views/DeptHead/Dashboard.cshtml");
        public IActionResult Groups() => View("~/Views/DeptHead/Groups.cshtml");
        public IActionResult Teams() => View("~/Views/DeptHead/Teams.cshtml");
        public IActionResult Reports() => View("~/Views/DeptHead/Reports.cshtml");
    }
}
