using Microsoft.AspNetCore.Mvc;

namespace OpsTracker_v1.Controllers
{
    public class TLController : Controller
    {
        public ActionResult Dashboard()
        {
            return View("~/Views/TLDashboard/Index.cshtml");
        }

        public ActionResult Approvals()
        {
            return View("~/Views/TLApproval/Index.cshtml");
        }

        public ActionResult Team()
        {
            return View("~/Views/TLMyTeam/Index.cshtml");
        }

        public ActionResult Groups()
        {
            return View("~/Views/Group/Index.cshtml");
        }
    }
}