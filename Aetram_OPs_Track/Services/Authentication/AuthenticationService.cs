using System.Data;
using System.Net;
using Aetram_OPs_Track.DAL;
using Aetram_OPs_Track.Infrastructure;
using Aetram_OPs_Track.Models.Entities;
using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;
using Aetram_OPs_Track.Security;
using Microsoft.Extensions.Options;

namespace Aetram_OPs_Track.Services.Authentication;

public sealed class AuthenticationService : IAuthenticationService
{
    private const string GenericLoginError = "Invalid email or password.";

    /// <summary>
    /// Parameterized query — replace with <c>usp_User_GetForLogin</c> if Registration_Page uses stored procedures only.
    /// </summary>
    private const string GetUserByEmailSql = """
        SELECT UserId, Email, FirstName, LastName, Role, PasswordHash, PasswordSalt, IsActive
        FROM Users
        WHERE Email = @Email
        """;

    private readonly IDBClass _db;
    private readonly IPasswordVerifier _passwordVerifier;
    private readonly AuthenticationOptions _authOptions;
    private readonly ILogger<AuthenticationService> _logger;

    public AuthenticationService(
        IDBClass db,
        IPasswordVerifier passwordVerifier,
        IOptionsSnapshot<AuthenticationOptions> authOptions,
        ILogger<AuthenticationService> logger)
    {
        _db = db;
        _passwordVerifier = passwordVerifier;
        _authOptions = authOptions.Value;
        _logger = logger;
    }

    public async Task<AjaxAuthResponse> SignInAsync(
        LoginRequest request,
        string? returnUrl,
        HttpContext httpContext,
        CancellationToken cancellationToken = default)
    {
        UserAuthRecord? user;
        try
        {
            user = await LoadUserByEmailAsync(request.Email.Trim(), cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed while loading user for {Email}", request.Email);
            return AjaxAuthResponse.Fail("Unable to sign in right now. Please try again.");
        }

        if (user is not { IsActive: true })
            return AjaxAuthResponse.Fail(GenericLoginError);

        if (!_passwordVerifier.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
            return AjaxAuthResponse.Fail(GenericLoginError);

        var session = httpContext.Session;
        session.SetInt32(SessionKeys.UserId, user.UserId);
        session.SetString(SessionKeys.Email, user.Email);
        var display = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        session.SetString(SessionKeys.DisplayName, string.IsNullOrWhiteSpace(display) ? user.Email : display);
        session.SetString(SessionKeys.Role, user.Role);

        var redirect = SafeLocalRedirect(returnUrl, _authOptions.DefaultRedirectPath);
        return AjaxAuthResponse.Ok(redirect);
    }

    public void SignOut(HttpContext httpContext) => httpContext.Session.Clear();

    public bool IsAuthenticated(HttpContext httpContext) =>
        httpContext.Session.GetInt32(SessionKeys.UserId) is > 0;

    private async Task<UserAuthRecord?> LoadUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var table = await _db.ExecuteDataTableAsync(
            GetUserByEmailSql,
            CommandType.Text,
            cancellationToken,
            _db.CreateParameter("@Email", email)).ConfigureAwait(false);

        if (table.Rows.Count == 0)
            return null;

        return MapRow(table.Rows[0]);
    }

    private static UserAuthRecord MapRow(DataRow row) => new()
    {
        UserId = Convert.ToInt32(row["UserId"]),
        Email = row["Email"]?.ToString() ?? string.Empty,
        FirstName = row["FirstName"]?.ToString() ?? string.Empty,
        LastName = row["LastName"]?.ToString(),
        Role = row["Role"]?.ToString() ?? "MEMBER",
        PasswordHash = row["PasswordHash"]?.ToString() ?? string.Empty,
        PasswordSalt = row["PasswordSalt"]?.ToString() ?? string.Empty,
        IsActive = row["IsActive"] != DBNull.Value && Convert.ToBoolean(row["IsActive"])
    };

    /// <summary>Prevents open redirects: only relative application URLs are allowed.</summary>
    private static string SafeLocalRedirect(string? returnUrl, string defaultPath)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
            return defaultPath;

        // Decode once; reject absolute or protocol-relative URLs
        var decoded = WebUtility.UrlDecode(returnUrl.Trim());
        if (!decoded.StartsWith("/", StringComparison.Ordinal) ||
            decoded.StartsWith("//", StringComparison.Ordinal) ||
            decoded.Contains("://", StringComparison.Ordinal))
            return defaultPath;

        return decoded;
    }
}
