using Aetram_OpsTrack.DBO.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Serilog;
using System.Data;

public class Logs : ILogs
{
    private readonly IConfiguration _configuration;

    public Logs(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task LogUserActivityAsync(
        HttpContext context,
        int userId,
        string activity)
    {
        try
        {
            string ipAddress =
                context.Connection.RemoteIpAddress?.ToString();

            using SqlConnection con =
                new SqlConnection(
                    _configuration.GetConnectionString("DefaultConnection"));

            using SqlCommand cmd =
                new SqlCommand("sp_InsertUserActivityLog", con);

            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@Activity", activity);
            cmd.Parameters.AddWithValue("@IPAddress",
                ipAddress ?? (object)DBNull.Value);

            await con.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            Log.Information(
                "User Activity Logged. UserId: {UserId}, Activity: {Activity}",
                userId,
                activity);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error while logging user activity");
        }
    }

    public async Task LogAuditAsync(
        string tableName,
        int recordId,
        string actionType,
        string oldData,
        string newData,
        int actionBy,
        string ipAddress)
    {
        try
        {
            using SqlConnection con =
                new SqlConnection(
                    _configuration.GetConnectionString("DefaultConnection"));

            using SqlCommand cmd =
                new SqlCommand("sp_InsertAuditLog", con);

            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@TableName", tableName);
            cmd.Parameters.AddWithValue("@RecordId", recordId);
            cmd.Parameters.AddWithValue("@ActionType", actionType);
            cmd.Parameters.AddWithValue("@OldData",
                oldData ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@NewData",
                newData ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("@ActionBy", actionBy);
            cmd.Parameters.AddWithValue("@IPAddress",
                ipAddress ?? (object)DBNull.Value);

            await con.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            Log.Information(
                "Audit Logged. Table: {TableName}, Action: {ActionType}",
                tableName,
                actionType);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error while logging audit");
        }
    }

    public async Task LogExceptionAsync(
        Exception ex,
        HttpContext context,
        int? userId = null)
    {
        try
        {
            string controllerName =
                context.GetRouteData()?.Values["controller"]?.ToString();

            string actionName =
                context.GetRouteData()?.Values["action"]?.ToString();

            string requestData =
                context.Request.Path;

            using SqlConnection con =
                new SqlConnection(
                    _configuration.GetConnectionString("DefaultConnection"));

            using SqlCommand cmd =
                new SqlCommand("sp_InsertExceptionLog", con);

            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@UserId",
                userId ?? (object)DBNull.Value);

            cmd.Parameters.AddWithValue("@ControllerName",
                controllerName ?? (object)DBNull.Value);

            cmd.Parameters.AddWithValue("@ActionName",
                actionName ?? (object)DBNull.Value);

            cmd.Parameters.AddWithValue("@ExceptionMessage",
                ex.Message);

            cmd.Parameters.AddWithValue("@StackTrace",
                ex.StackTrace ?? (object)DBNull.Value);

            cmd.Parameters.AddWithValue("@RequestData",
                requestData ?? (object)DBNull.Value);

            await con.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            Log.Error(ex,
                "Exception Logged. Controller: {ControllerName}, Action: {ActionName}",
                controllerName,
                actionName);
        }
        catch (Exception logEx)
        {
            Log.Fatal(logEx, "Critical error while saving exception log");
        }
    }
}