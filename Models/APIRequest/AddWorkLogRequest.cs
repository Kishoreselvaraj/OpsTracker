using System.ComponentModel.DataAnnotations;

namespace Aetram_OpsTrack.Models.Request
{
    public class SaveWorkLogRequest
    {
        public int WorkflowLogDateId { get; set; }

        public DateTime WorkDate { get; set; }

        public List<SaveWorkLogItemRequest> Logs { get; set; }
    }

    public class SaveWorkLogItemRequest
    {
        public int WorkLogId { get; set; }

        public int GroupId { get; set; }

        public int? SubGroupId { get; set; }

        public string HoursWorked { get; set; }

        public string WorkStatus { get; set; }

        public string WorkDescription { get; set; }
    }
    public class GetMonthlyCalendarRequest
    {
        public int Month { get; set; }

        public int Year { get; set; }
    }

    public class GetWorkLogByDateRequest
    {
        public int UserId { get; set; }
        public DateTime WorkDate { get; set; }
    }

    public class UpdateWorkLogRequest
    {
        public int WorkLogId { get; set; }

        public int GroupId { get; set; }

        public int? SubGroupId { get; set; }

        public DateTime WorkDate { get; set; }

        public decimal HoursWorked { get; set; }

        public string WorkDescription { get; set; }

        public string ApprovalStatus { get; set; }

        public string? ReasonForReject { get; set; }
    }
    public class GetWorkLogByIdRequest
    {
        public int WorkLogId { get; set; }
    }
}