namespace Aetram_OpsTrack.Models.APIResponse
{
    public class AddTaskGroupResponse
    {
        public int StatusCode { get; set; }

        public string Message { get; set; }

        public int TaskGroupId { get; set; }
    }

    public class TaskGroupListResponse
    {
        public int GroupId { get; set; }

        public int DepartmentId { get; set; }

        public string DepartmentName { get; set; }

        public int? AssignedTeamLeadId { get; set; }

        public string TeamLeadName { get; set; }

        public string GroupName { get; set; }

        public string Description { get; set; }

        public int? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsActive { get; set; }
    }
}
