using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using OpsTracker_v1.Models;

namespace OpsTracker_v1.Controllers;

public class LoginController : Controller
{
    public IActionResult Index()
    {
        return View();
    }
}