using Microsoft.AspNetCore.Mvc;

namespace OpsTracker_v1.Controllers
{
    public class DashboardController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}