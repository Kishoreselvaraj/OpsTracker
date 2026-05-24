namespace Aetram_OpsTrack.Models.Response
{
    namespace Aetram_OpsTrack.Models.Response
    {
        public class SaveWorkLogResponse
        {
            public int StatusCode { get; set; }

            public string Message { get; set; }

            public int WorkflowLogDateId { get; set; }

            public string EntryStatus { get; set; }

            public string TotalWorkHours { get; set; }

            public string ExtraHours { get; set; }
        }
    }
    public class MonthlyCalendarResponse
    {
        public int WorkflowLogDateId { get; set; }

        public DateTime WorkDate { get; set; }

        public int Day { get; set; }

        public string DayName { get; set; }

        public bool IsCurrentMonth { get; set; }

        public string TotalWorkHours { get; set; }

        public string StandardHours { get; set; }

        public string ExtraHours { get; set; }

        public string EntryStatus { get; set; }

        public string ApprovalStatus { get; set; }

        public int WorkLogId { get; set; }

        public int GroupId { get; set; }

        public string GroupName { get; set; }

        public int? SubGroupId { get; set; }

        public string SubGroupName { get; set; }

        public string TaskDuration { get; set; }

        public string WorkStatus { get; set; }

        public string TaskApprovalStatus { get; set; }

        public string WorkDescription { get; set; }
    }
    public class GetWorkLogResponse
    {
        public int WorkLogId { get; set; }
        public int UserId { get; set; }
        public int GroupId { get; set; }
        public int? SubGroupId { get; set; }
        public DateTime WorkDate { get; set; }
        public decimal HoursWorked { get; set; }
        public string WorkDescription { get; set; }
        public string ApprovalStatus { get; set; }
        public DateTime SubmittedAt { get; set; }

        public string? ReasonForReject { get; set; }
    }
    public class WorkLogUpdateResponse
    {
        public int StatusCode { get; set; }

        public string Message { get; set; }

        public GetWorkLogResponse Data { get; set; }
    }
}                                                                                                                                