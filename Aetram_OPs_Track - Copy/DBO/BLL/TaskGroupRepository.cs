using Aetram_OpsTrack.DAL;
using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.APIRequest;
using Aetram_OpsTrack.Models.APIResponse;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Aetram_OpsTrack.Utilities;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json.Linq;
using System.Data;

namespace Aetram_OpsTrack.DBO.BLL
{
    public class TaskGroupRepository : ITaskGroupRepository
    {
        private readonly IDBClass _DBClass;
        private readonly JwtTokenHelper _jwtTokenHelper;

        public TaskGroupRepository(
            IDBClass dBClass,
            JwtTokenHelper jwtTokenHelper)
        {
            _DBClass = dBClass;
            _jwtTokenHelper = jwtTokenHelper;
        }
        public async Task<AddTaskGroupResponse>
            AddTaskGroupAsync(
                AddTaskGroupRequest request,
                int createdBy)
        {
            SqlParameter[] parameters =
            {
        new SqlParameter(
            "@DepartmentId",
            request.DepartmentId),

        new SqlParameter(
            "@AssignedTeamLeadId",
            (object?)request.AssignedTeamLeadId
            ?? DBNull.Value),

        new SqlParameter(
            "@GroupName",
            request.GroupName),

        new SqlParameter(
            "@Description",
            (object?)request.Description
            ?? DBNull.Value),

        new SqlParameter(
            "@CreatedBy",
            createdBy)
    };

            DataTable dt =
                await _DBClass
                    .ExecuteProcedureForDataTable(
                        "usp_TaskGroup_Add",
                        parameters);

            if (dt.Rows.Count == 0)
            {
                return new AddTaskGroupResponse
                {
                    StatusCode = 500,
                    Message = "Unexpected error"
                };
            }

            DataRow row = dt.Rows[0];

            return new AddTaskGroupResponse
            {
                StatusCode =
                    Convert.ToInt32(
                        row["StatusCode"]),

                Message =
                    row["Message"].ToString(),

                TaskGroupId =
                    row.Table.Columns.Contains("TaskGroupId")
                    ? Convert.ToInt32(
                        row["TaskGroupId"])
                    : 0
            };
        }

        public async Task<List<TaskGroupListResponse>>
    GetTaskGroupListAsync()
        {
            DataTable dt =
                await _DBClass
                    .ExecuteProcedureForDataTable(
                        "usp_TaskGroup_List",
                        null);

            List<TaskGroupListResponse> list = new();

            foreach (DataRow row in dt.Rows)
            {
                list.Add(new TaskGroupListResponse
                {
                    GroupId =
                        Convert.ToInt32(
                            row["GroupId"]),

                    DepartmentId =
                        Convert.ToInt32(
                            row["DepartmentId"]),

                    DepartmentName  =
                        row["DepartmentName"]
                            .ToString(),

                    AssignedTeamLeadId =
                        row["AssignedTeamLeadId"]
                            == DBNull.Value
                        ? null
                        : Convert.ToInt32(
                            row["AssignedTeamLeadId"]),

                    TeamLeadName  =
                        row["TeamLeadName"]
                            == DBNull.Value
                        ? null
                        : row["TeamLeadName"]
                            .ToString(),

                    GroupName =
                        row["GroupName"]
                            .ToString(),

                    Description =
                        row["Description"]
                            == DBNull.Value
                        ? null
                        : row["Description"]
                            .ToString(),

                    CreatedBy =
                        row["CreatedBy"]
                            == DBNull.Value
                        ? null
                        : Convert.ToInt32(
                            row["CreatedBy"]),

                    CreatedAt =
                        Convert.ToDateTime(
                            row["CreatedAt"]),

                    IsActive =
                        Convert.ToBoolean(
                            row["IsActive"])
                });
            }

            return list;
        }
    }

}