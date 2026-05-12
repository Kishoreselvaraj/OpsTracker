using System.Data;
using Microsoft.Data.SqlClient;
using Aetram_OPs_Track.DAL;
using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;
using Aetram_OPs_Track.Security;
using Microsoft.Extensions.Options;

namespace Aetram_OPs_Track.Services.Registration;

public sealed class RegistrationService : IRegistrationService
{
    private const string EmailExistsSql = "SELECT COUNT(1) FROM Users WHERE Email = @Email;";
    private const string EmployeeCodeExistsSql = "SELECT COUNT(1) FROM Users WHERE EmployeeCode = @EmployeeCode;";

    private const string InsertUserSql = """
        INSERT INTO Users (EmployeeCode, FirstName, LastName, Email, PasswordHash, PasswordSalt, MobileNo, Role, IsActive, CreatedAt)
        VALUES (@EmployeeCode, @FirstName, @LastName, @Email, @PasswordHash, @PasswordSalt, @MobileNo, @Role, 1, SYSUTCDATETIME());
        """;

    private readonly IDBClass _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly AuthenticationOptions _authOptions;
    private readonly ILogger<RegistrationService> _logger;

    public RegistrationService(
        IDBClass db,
        IPasswordHasher passwordHasher,
        IOptionsSnapshot<AuthenticationOptions> authOptions,
        ILogger<RegistrationService> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _authOptions = authOptions.Value;
        _logger = logger;
    }

    public async Task<AjaxAuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();
        var code = request.EmployeeCode.Trim();

        try
        {
            if (await ExistsAsync(EmailExistsSql, "@Email", email, cancellationToken).ConfigureAwait(false))
                return AjaxAuthResponse.Fail("This email is already registered.");

            if (await ExistsAsync(EmployeeCodeExistsSql, "@EmployeeCode", code, cancellationToken).ConfigureAwait(false))
                return AjaxAuthResponse.Fail("This employee code is already in use.");

            var material = _passwordHasher.Hash(request.Password);

            await _db.ExecuteNonQueryAsync(
                InsertUserSql,
                CommandType.Text,
                cancellationToken,
                _db.CreateParameter("@EmployeeCode", code),
                _db.CreateParameter("@FirstName", request.FirstName.Trim()),
                _db.CreateParameter("@LastName", string.IsNullOrWhiteSpace(request.LastName) ? (object)DBNull.Value : request.LastName.Trim()),
                _db.CreateParameter("@Email", email),
                _db.CreateParameter("@PasswordHash", material.HashBase64),
                _db.CreateParameter("@PasswordSalt", material.SaltBase64),
                _db.CreateParameter("@MobileNo", string.IsNullOrWhiteSpace(request.MobileNo) ? (object)DBNull.Value : request.MobileNo.Trim()),
                _db.CreateParameter("@Role", "MEMBER")).ConfigureAwait(false);
        }
        catch (Exception ex) when (IsUniqueConstraint(ex))
        {
            return AjaxAuthResponse.Fail("Email or employee code is already registered.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "User registration failed for {Email}", email);
            return AjaxAuthResponse.Fail("Registration could not be completed. Please try again.");
        }

        return AjaxAuthResponse.Ok(_authOptions.DefaultPostRegisterRedirectPath);
    }

    private async Task<bool> ExistsAsync(string sql, string paramName, string value, CancellationToken cancellationToken)
    {
        var scalar = await _db.ExecuteScalarAsync(sql, CommandType.Text, cancellationToken, _db.CreateParameter(paramName, value))
            .ConfigureAwait(false);
        return scalar != null && Convert.ToInt64(scalar, System.Globalization.CultureInfo.InvariantCulture) > 0;
    }

    private static bool IsUniqueConstraint(Exception ex)
    {
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (e is SqlException sql && (sql.Number == 2627 || sql.Number == 2601))
                return true;
        }

        return false;
    }
}
