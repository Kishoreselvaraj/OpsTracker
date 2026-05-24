using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Security.Claims;

namespace Aetram_OpsTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WorkLogController : ControllerBase
    {
        private readonly IWorkLogRepository _workLogRepository;
        private readonly ILogs _logs;

        public WorkLogController(
            IWorkLogRepository workLogRepository,
            ILogs logs)
        {
            _workLogRepository = workLogRepository;
            _logs = logs;
        }
        [Authorize]
        [HttpPost("save")]
        public async Task<IActionResult> SaveWorkLog(
            [FromBody] SaveWorkLogRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "Invalid request"
                    });
                }

                //------------------------------------------------
                // WorkDate validation
                //------------------------------------------------

                if (request.WorkDate == DateTime.MinValue)
                {
                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "WorkDate is required"
                    });
                }

                //------------------------------------------------
                // Logs validation
                //------------------------------------------------

                if (request.Logs == null ||
                    request.Logs.Count == 0)
                {
                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "At least one log is required"
                    });
                }

                //------------------------------------------------
                // Validate each log
                //------------------------------------------------

                foreach (var log in request.Logs)
                {
                    if (log.GroupId <= 0)
                    {
                        return BadRequest(new
                        {
                            StatusCode = 400,
                            Message = "GroupId is required"
                        });
                    }

                    if (string.IsNullOrWhiteSpace(
                        log.HoursWorked))
                    {
                        return BadRequest(new
                        {
                            StatusCode = 400,
                            Message = "HoursWorked is required"
                        });
                    }

                    if (string.IsNullOrWhiteSpace(
                        log.WorkDescription))
                    {
                        return BadRequest(new
                        {
                            StatusCode = 400,
                            Message = "WorkDescription is required"
                        });
                    }
                }

                //------------------------------------------------
                // Get UserId from token
                //------------------------------------------------

                var userIdClaim =
                    User.FindFirst(
                        ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized(new
                    {
                        StatusCode = 401,
                        Message = "Invalid token"
                    });
                }

                int userId =
                    Convert.ToInt32(
                        userIdClaim.Value);

                //------------------------------------------------
                // Save
                //------------------------------------------------

                var result =
                    await _workLogRepository
                        .SaveWorkLogAsync(
                            request,
                            userId);

                return StatusCode(
                    result.StatusCode,
                    result);
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(
                    ex,
                    HttpContext);

                return StatusCode(500, new
                {
                    StatusCode = 500,
                    Message = ex.Message
                });
            }
        }
        [Authorize]
        [HttpPost("monthly-calendar")]
        public async Task<IActionResult>
    GetMonthlyCalendar(
        [FromBody]
        GetMonthlyCalendarRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "Invalid request"
                    });
                }

                var userIdClaim =
                    User.FindFirst(
                        ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized(new
                    {
                        StatusCode = 401,
                        Message = "Invalid token"
                    });
                }

                int userId =
                    Convert.ToInt32(
                        userIdClaim.Value);

                var result =
                    await _workLogRepository
                        .GetMonthlyCalendarAsync(
                            userId,
                            request.Month,
                            request.Year);

                return Ok(new
                {
                    StatusCode = 200,
                    Message =
                        "Monthly calendar fetched successfully",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(
                    ex,
                    HttpContext);

                return StatusCode(500, new
                {
                    StatusCode = 500,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("by-date")]
        public async Task<IActionResult> GetByDate([FromBody] GetWorkLogByDateRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Invalid request"
                });
            }

            var result = await _workLogRepository.GetWorkLogsByDateAsync(
                request.UserId,
                request.WorkDate);

            return Ok(result);
        }
        [Authorize]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateWorkLog(
            [FromBody] UpdateWorkLogRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        StatusCode = 400,
                        Message = "Invalid request"
                    });
                }

                var userIdClaim =
                    User.FindFirst(
                        System.Security.Claims.ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized(new
                    {
                        StatusCode = 401,
                        Message = "Invalid token"
                    });
                }

                int userId =
                    Convert.ToInt32(userIdClaim.Value);

                var result =
                    await _workLogRepository
                        .UpdateWorkLogAsync(
                            request,
                            userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        StatusCode = 404,
                        Message = "WorkLog not found"
                    });
                }

                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(ex, HttpContext);

                return StatusCode(500, new
                {
                    StatusCode = 500,
                    Message = ex.Message
                });
            }
        }
          [Authorize]
        [HttpPost("get-by-id")]
        public async Task<IActionResult> GetWorkLogById(
    [FromBody] GetWorkLogByIdRequest request)
        {
            try
            {
                var userIdClaim =
                    User.FindFirst(
                        System.Security.Claims.ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized(new
                    {
                        StatusCode = 401,
                        Message = "Invalid token"
                    });
                }

                int userId =
                    Convert.ToInt32(userIdClaim.Value);
                Console.WriteLine(userId);

                var result =
                    await _workLogRepository
                        .GetWorkLogByIdAsync(
                            request.WorkLogId,
                            userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        StatusCode = 404,
                        Message = "WorkLog not found"
                    });
                }

                return Ok(new
                {
                    StatusCode = 200,
                    Message = "WorkLog fetched successfully",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(ex, HttpContext);

                return StatusCode(500, new
                {
                    StatusCode = 500,
                    Message = ex.Message
                });
            }
        }
    }
}