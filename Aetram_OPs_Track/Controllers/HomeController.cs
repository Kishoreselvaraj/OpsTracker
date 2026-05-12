using Microsoft.AspNetCore.Mvc;
using Aetram_OPs_Track.Models;

namespace Aetram_OPs_Track.Controllers;

public class HomeController : BaseController
{
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(ErrorViewModel.FromActivity());
    }
}
