using Aetram_OpsTrack.DAL;
using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Aetram_OpsTrack.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Aetram_OpsTrack.DBO.BLL
{
    public class RegisterRepository : IRegisterRepository
    {
        private readonly IDBClass _DBClass;
        private readonly ILogs _logs;

        public RegisterRepository(
            IDBClass dBClass,
            ILogs logs)
        {
            _DBClass = dBClass;
            _logs = logs;
        }

        public async Task<RegisterUserResponse> RegisterUserAsync(
            RegisterUserRequest request)
        {
            try
            {
                PasswordHelper.CreatePasswordHash(
                    request.Password,
                    out string passwordHash,
                    out string passwordSalt);

                SqlParameter[] parameters =
                {
                    new SqlParameter("@FirstName", request.FirstName),

                    new SqlParameter("@LastName",
                        (object?)request.LastName ?? DBNull.Value),

                    new SqlParameter("@Email",
                        request.Email.Trim().ToLower()),

                    new SqlParameter("@PasswordHash",
                        passwordHash),

                    new SqlParameter("@PasswordSalt",
                        passwordSalt),

                    new SqlParameter("@MobileNo",
                        (object?)request.MobileNo ?? DBNull.Value),

                    new SqlParameter("@Role",
                        request.Role),

                    new SqlParameter("@Designation",
                        (object?)request.Designation ?? DBNull.Value),

                    new SqlParameter("@CreatedBy",
                        (object?)request.CreatedBy ?? DBNull.Value)
                };

                DataTable dt =
                    await _DBClass.ExecuteProcedureForDataTable(
                        "InsRegisterUser",
                        parameters);

                if (dt.Rows.Count > 0)
                {
                    return new RegisterUserResponse
                    {
                        StatusCode =
                            Convert.ToInt32(dt.Rows[0]["StatusCode"]),

                        Message =
                            dt.Rows[0]["Message"].ToString(),

                        LastInsertedID =
                            Convert.ToInt32(dt.Rows[0]["LastInsertedID"])
                    };
                }

                return new RegisterUserResponse
                {
                    StatusCode = 500,
                    Message = "Unexpected Error",
                    LastInsertedID = 0
                };
            }
            catch (Exception ex)
            {
                await _logs.LogExceptionAsync(
                    ex,
                    new DefaultHttpContext());

                return new RegisterUserResponse
                {
                    StatusCode = 500,
                    Message = "Internal Server Error",
                    LastInsertedID = 0
                };
            }
        }
    }
}