using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aetram_OpsTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {

        [HttpGet("debug")]
        [Authorize]
        public IActionResult Debug()
        {
            var authHeader = HttpContext.Request.Headers["Authorization"].ToString();

            return Ok(new
            {
                Header = authHeader,
                IsAuthenticated = User.Identity?.IsAuthenticated,
                Name = User.Identity?.Name
            });
        }
    }
}