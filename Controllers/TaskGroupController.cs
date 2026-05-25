using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.APIRequest;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aetram_OpsTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskGroupController : ControllerBase
    {

        private readonly ITaskGroupRepository _taskGroupRepository;
        private readonly ILogs _logs;

        public TaskGroupController(
            ITaskGroupRepository taskGroupRepository,
            ILogs logs)
        {
            _taskGroupRepository = taskGroupRepository;
            _logs = logs;
        }

        [Authorize]
        [HttpPost("add-task-group")]
        public async Task<IActionResult>
    AddTaskGroup(
        [FromBody]
        AddTaskGroupRequest request)
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

                int createdBy =
                    Convert.ToInt32(
                        userIdClaim.Value);

                var result =
                    await _taskGroupRepository
                        .AddTaskGroupAsync(
                            request,
                            createdBy);

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
        [HttpPost("list")]
        public async Task<IActionResult>GetTaskGroupList()
        {
            try
            {
                var result =
                    await _taskGroupRepository
                        .GetTaskGroupListAsync();

                return Ok(new
                {
                    StatusCode = 200,
                    Message =
                        "Task Group list fetched successfully",
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


    }
}
