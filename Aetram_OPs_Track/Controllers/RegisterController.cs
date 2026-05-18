using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aetram_OpsTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RegisterController : ControllerBase
    {
        private readonly IRegisterRepository _userRepository;
        private readonly ILogs _logs;

        public RegisterController(
            IRegisterRepository userRepository,
            ILogs logs)
        {
            _userRepository = userRepository;
            _logs = logs;
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterUserRequest request)
        {
            try
            {
                if (request == null)
                {
                    await _logs.LogUserActivityAsync(
                        HttpContext,
                        0,
                        "Invalid Registration Request");

                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "Invalid request data"
                    });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                RegisterUserResponse result =
                    await _userRepository.RegisterUserAsync(request);

                if (result.StatusCode == 200)
                {
                    await _logs.LogUserActivityAsync(
                        HttpContext,
                        result.LastInsertedID,
                        "User Registered Successfully");
                }

                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(
                    ex,
                    HttpContext);

                return StatusCode(500, new
                {
                    StatusCode = 500,
                    Message = "Internal Server Error"
                });
            }
        }
    }
}