using Aetram_OpsTrack.DAL;
using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Aetram_OpsTrack.Models.Response.Aetram_OpsTrack.Models.Response;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;
using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Aetram_OpsTrack.DBO.BLL
{
    public class WorkLogRepository : IWorkLogRepository
    {
        private readonly IDBClass _DBClass;

        public WorkLogRepository(IDBClass dBClass)
        {
            _DBClass = dBClass;
        }
        public async Task<SaveWorkLogResponse> SaveWorkLogAsync(
            SaveWorkLogRequest request,
            int userId)
        {
            try
            {
                string logsJson =
                    Newtonsoft.Json.JsonConvert.SerializeObject(
                        request.Logs);

                SqlParameter[] parameters =
                {
            new SqlParameter(
                "@WorkflowLogDateId",
                request.WorkflowLogDateId),

            new SqlParameter(
                "@UserId",
                userId),

            new SqlParameter(
                "@WorkDate",
                request.WorkDate),

            new SqlParameter(
                "@Logs",
                logsJson)
        };

                DataTable dt =
                    await _DBClass.ExecuteProcedureForDataTable(
                        "usp_WorkLog_Save",
                        parameters);

                if (dt.Rows.Count > 0)
                {
                    DataRow row = dt.Rows[0];

                    SaveWorkLogResponse response =
                        new SaveWorkLogResponse();

                    response.StatusCode =
                        Convert.ToInt32(
                            row["StatusCode"]);

                    response.Message =
                        row["Message"].ToString();

            if (response.StatusCode == 200)
                        {
                            response.WorkflowLogDateId =
                                Convert.ToInt32(
                                    row["WorkflowLogDateId"]);

                            response.EntryStatus =
                                row["EntryStatus"].ToString();

                            response.TotalWorkHours =
                                row["TotalWorkHours"].ToString();

                            response.ExtraHours =
                                row["ExtraHours"].ToString();
                        }

                    return response;
                }

                return new SaveWorkLogResponse
                {
                    StatusCode = 500,
                    Message = "No response from database"
                };
            }
            catch (Exception ex)
            {
                return new SaveWorkLogResponse
                {
                    StatusCode = 500,
                    Message = ex.Message
                };
            }
        }
        public async Task<List<MonthlyCalendarResponse>>
    GetMonthlyCalendarAsync(
        int userId,
        int month,
        int year)
        {
            var parameters = new[]
            {
        new SqlParameter("@UserId", userId),

        new SqlParameter("@Month", month),

        new SqlParameter("@Year", year)
    };

            DataTable dt =
                await _DBClass.ExecuteProcedureForDataTable(
                    "usp_WorkLog_GetMonthlyCalendar",
                    parameters);
            Console.WriteLine("Rows Count = " + dt.Rows.Count);

            List<MonthlyCalendarResponse> list = new();

            foreach (DataRow row in dt.Rows)
            {
                list.Add(new MonthlyCalendarResponse
                {
                    WorkflowLogDateId =
                        Convert.ToInt32(
                            row["WorkflowLogDateId"]),

                    WorkDate =
                        Convert.ToDateTime(
                            row["WorkDate"]),

                    Day =
                        Convert.ToInt32(
                            row["Day"]),

                    DayName =
                        row["DayName"].ToString(),

                    IsCurrentMonth =
                        Convert.ToBoolean(
                            row["IsCurrentMonth"]),

                    TotalWorkHours =
                        row["TotalWorkHours"].ToString(),

                    StandardHours =
                        row["StandardHours"].ToString(),

                    ExtraHours =
                        row["ExtraHours"].ToString(),

                    EntryStatus =
                        row["EntryStatus"].ToString(),

                    ApprovalStatus =
                        row["ApprovalStatus"].ToString(),

                    WorkLogId =
                        Convert.ToInt32(
                            row["WorkLogId"]),

                    GroupId =
                        Convert.ToInt32(
                            row["GroupId"]),

                    GroupName =
                        row["GroupName"].ToString(),

                    SubGroupId =
                        row["SubGroupId"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(
                            row["SubGroupId"]),

                    SubGroupName =
                        row["SubGroupName"].ToString(),

                    TaskDuration =
                        row["TaskDuration"].ToString(),

                    WorkStatus =
                        row["WorkStatus"].ToString(),

                    TaskApprovalStatus =
                        row["TaskApprovalStatus"].ToString(),

                    WorkDescription =
                        row["WorkDescription"].ToString()
                });
            }

            return list;
        }
        public async Task<List<GetWorkLogResponse>> GetWorkLogsByDateAsync(int userId, DateTime workDate)
        {
            try
            {
                var parameters = new[]
                {
            new SqlParameter("@UserId", userId),
            new SqlParameter("@WorkDate", workDate.Date)
        };

                DataTable dt = await _DBClass
                    .ExecuteProcedureForDataTable("sp_GetWorkLogsByDate", parameters);

                List<GetWorkLogResponse> list = new();

                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new GetWorkLogResponse
                    {
                        WorkLogId = Convert.ToInt32(row["WorkLogId"]),
                        UserId = Convert.ToInt32(row["UserId"]),
                        GroupId = Convert.ToInt32(row["GroupId"]),
                        SubGroupId = row["SubGroupId"] == DBNull.Value ? null : Convert.ToInt32(row["SubGroupId"]),
                        WorkDate = Convert.ToDateTime(row["WorkDate"]),
                        HoursWorked = Convert.ToDecimal(row["HoursWorked"]),
                        WorkDescription = row["WorkDescription"].ToString(),
                        ApprovalStatus = row["ApprovalStatus"].ToString(),
                        SubmittedAt = Convert.ToDateTime(row["SubmittedAt"])
                    });
                }

                return list;
            }
            catch
            {
                return new List<GetWorkLogResponse>();
            }

        }





        public async Task<WorkLogUpdateResponse> UpdateWorkLogAsync(
            UpdateWorkLogRequest request,
            int userId)
        {
            var parameters = new[]
            {
        new SqlParameter("@WorkLogId", request.WorkLogId),

        new SqlParameter("@UserId", userId),

        new SqlParameter("@GroupId", request.GroupId),

        new SqlParameter(
            "@SubGroupId",
            (object?)request.SubGroupId ?? DBNull.Value),

        new SqlParameter("@WorkDate", request.WorkDate),

        new SqlParameter("@HoursWorked", request.HoursWorked),

        new SqlParameter(
            "@WorkDescription",
            request.WorkDescription),

        new SqlParameter(
            "@ApprovalStatus",
            request.ApprovalStatus),

        new SqlParameter(
            "@ReasonForReject",
            (object?)request.ReasonForReject ?? DBNull.Value)
    };
            Console.WriteLine("UPDATE USER ID = " + userId);

            Console.WriteLine("UPDATE WORKLOG ID = " + request.WorkLogId);

            DataTable dt =
                await _DBClass.ExecuteProcedureForDataTable(
                    "sp_UpdateWorkLog",
                    parameters);

            if (dt.Rows.Count == 0)
            {
                return null;
            }

            DataRow row = dt.Rows[0];

            var data = new GetWorkLogResponse
            {
                WorkLogId =
                    Convert.ToInt32(row["WorkLogId"]),

                UserId =
                    Convert.ToInt32(row["UserId"]),

                GroupId =
                    Convert.ToInt32(row["GroupId"]),

                SubGroupId =
                    row["SubGroupId"] == DBNull.Value
                    ? null
                    : Convert.ToInt32(row["SubGroupId"]),

                WorkDate =
                    Convert.ToDateTime(row["WorkDate"]),

                HoursWorked =
                    Convert.ToDecimal(row["HoursWorked"]),

                WorkDescription =
                    row["WorkDescription"].ToString(),

                ApprovalStatus =
                    row["ApprovalStatus"].ToString(),

                ReasonForReject =
                    row["ReasonForReject"] == DBNull.Value
                    ? null
                    : row["ReasonForReject"].ToString(),

                SubmittedAt =
                    Convert.ToDateTime(row["SubmittedAt"])
            };

            return new WorkLogUpdateResponse
            {
                StatusCode = 200,
                Message = "WorkLog updated successfully",
                Data = data
            };
        }
        public async Task<GetWorkLogResponse> GetWorkLogByIdAsync(
    int workLogId,
    int userId)
        {
            var parameters = new[]
            {
        new SqlParameter("@WorkLogId", workLogId),
        new SqlParameter("@UserId", userId)
    };

            DataTable dt =
                await _DBClass.ExecuteProcedureForDataTable(
                    "sp_GetWorkLogById",
                    parameters);

            if (dt.Rows.Count == 0)
            {
                return null;
            }

            DataRow row = dt.Rows[0];

            return new GetWorkLogResponse
            {
                WorkLogId =
                    Convert.ToInt32(row["WorkLogId"]),

                UserId =
                    Convert.ToInt32(row["UserId"]),

                GroupId =
                    Convert.ToInt32(row["GroupId"]),

                SubGroupId =
                    row["SubGroupId"] == DBNull.Value
                    ? null
                    : Convert.ToInt32(row["SubGroupId"]),

                WorkDate =
                    Convert.ToDateTime(row["WorkDate"]),

                HoursWorked =
                    Convert.ToDecimal(row["HoursWorked"]),

                WorkDescription =
                    row["WorkDescription"].ToString(),

                ApprovalStatus =
                    row["ApprovalStatus"].ToString(),

                ReasonForReject =
                    row["ReasonForReject"] == DBNull.Value
                    ? null
                    : row["ReasonForReject"].ToString(),

                SubmittedAt =
                    Convert.ToDateTime(row["SubmittedAt"])
            };
        }
    }
}

