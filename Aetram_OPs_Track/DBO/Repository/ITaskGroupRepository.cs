using Aetram_OpsTrack.Models.APIRequest;
using Aetram_OpsTrack.Models.APIResponse;

namespace Aetram_OpsTrack.DBO.Repository
{
    public interface ITaskGroupRepository
    {
        Task<AddTaskGroupResponse>
    AddTaskGroupAsync(
        AddTaskGroupRequest request,
        int createdBy);

        Task<List<TaskGroupListResponse>>
    GetTaskGroupListAsync();
    }
}
