using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Aetram_OPs_Track.Infrastructure;

namespace Aetram_OPs_Track.Filters;

/// <summary>
/// Ensures <see cref="SessionKeys.UserId"/> is set; otherwise redirects to login with return URL.
/// </summary>
public sealed class RequireAuthenticatedSessionAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var http = context.HttpContext;
        if (http.Session.GetInt32(SessionKeys.UserId) is > 0)
            return;

        var returnPath = $"{http.Request.Path}{http.Request.QueryString}";
        context.Result = new RedirectToActionResult("Index", "Login", new { returnUrl = returnPath });
    }
}
