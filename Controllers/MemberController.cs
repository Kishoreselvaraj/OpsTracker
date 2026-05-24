using Microsoft.AspNetCore.Mvc;

namespace OpsTracker_v1.Controllers
{
    public class MemberController : Controller
    {
        public IActionResult Workspace() => View("~/Views/Member/Workspace.cshtml");
    }
}
