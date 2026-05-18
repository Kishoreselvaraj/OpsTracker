using Aetram_OpsTrack.DAL;
using Aetram_OpsTrack.DBO.Repository;
using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Aetram_OpsTrack.Utilities;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json.Linq;
using System.Data;

namespace Aetram_OpsTrack.DBO.BLL
{
    public class LoginRepository : ILoginRepository
    {
        private readonly IDBClass _DBClass;
        private readonly JwtTokenHelper _jwtTokenHelper;

        public LoginRepository(
            IDBClass dBClass,
            JwtTokenHelper jwtTokenHelper)
        {
            _DBClass = dBClass;
            _jwtTokenHelper = jwtTokenHelper;
        }
        public async Task<LoginResponse> LoginAsync(
            LoginRequest request)
        {
            try
            {
                SqlParameter[] parameters =
                {
            new SqlParameter("@Email",
                request.Email.Trim().ToLower())
        };

                DataTable dt =
                    await _DBClass.ExecuteProcedureForDataTable(
                        "sp_LoginUser",
                        parameters);

                if (dt.Rows.Count == 0)
                {
                    return new LoginResponse
                    {
                        StatusCode = 404,
                        Message = "User not found"
                    };
                }

                int statusCode =
                    Convert.ToInt32(dt.Rows[0]["StatusCode"]);

                string message =
                    dt.Rows[0]["Message"].ToString();

                if (statusCode != 200)
                {
                    return new LoginResponse
                    {
                        StatusCode = statusCode,
                        Message = message
                    };
                }

                string storedHash =
                    dt.Rows[0]["PasswordHash"]?.ToString();

                string storedSalt =
                    dt.Rows[0]["PasswordSalt"]?.ToString();

                if (string.IsNullOrEmpty(storedHash) ||
                    string.IsNullOrEmpty(storedSalt))
                {
                    return new LoginResponse
                    {
                        StatusCode = 500,
                        Message = "Password data missing"
                    };
                }

                bool isPasswordValid =
                    PasswordHelper.VerifyPasswordHash(
                        request.Password,
                        storedHash,
                        storedSalt);

                string token =
    _jwtTokenHelper.GenerateToken(
        Convert.ToInt32(dt.Rows[0]["UserId"]),
        dt.Rows[0]["Email"].ToString(),
        dt.Rows[0]["Role"].ToString());

                if (!isPasswordValid)
                {
                    return new LoginResponse
                    {
                        StatusCode = 401,
                        Message = "Invalid Password"
                    };
                }

                return new LoginResponse
                {
                    StatusCode = 200,
                    Message = "Login Successful",

                    UserId =
                        Convert.ToInt32(dt.Rows[0]["UserId"]),

                    EmployeeCode =
                        dt.Rows[0]["EmployeeCode"].ToString(),

                    FirstName =
                        dt.Rows[0]["FirstName"].ToString(),

                    LastName =
                        dt.Rows[0]["LastName"].ToString(),

                    Email =
                        dt.Rows[0]["Email"].ToString(),

                    Role =
                        dt.Rows[0]["Role"].ToString(),

                    Token = token
                };
            }
            catch (Exception ex)
            {
                return new LoginResponse
                {
                    StatusCode = 500,
                    Message = ex.Message
                };
            }
        }
    }
    
}