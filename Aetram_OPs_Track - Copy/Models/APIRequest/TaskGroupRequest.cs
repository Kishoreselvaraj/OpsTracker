namespace Aetram_OpsTrack.Models.APIRequest
{
    public class AddTaskGroupRequest
    {
        public int DepartmentId { get; set; }

        public int? AssignedTeamLeadId { get; set; }

        public string GroupName { get; set; }

        public string? Description { get; set; }
    }
}
