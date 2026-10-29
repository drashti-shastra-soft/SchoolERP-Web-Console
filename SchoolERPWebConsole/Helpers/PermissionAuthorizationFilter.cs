using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using SchoolERPWebConsole.Attributes;
using System.Security.Claims;

namespace SchoolERPWebConsole.Helpers
{
    public class PermissionAuthorizationFilter : IAsyncActionFilter
    {
        private readonly PermissionHelper _permHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public PermissionAuthorizationFilter(PermissionHelper permHelper, IHttpContextAccessor httpContextAccessor)
        {
            _permHelper = permHelper;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var endpoint = context.HttpContext.GetEndpoint();

            if (endpoint?.Metadata?.GetMetadata<IAllowAnonymous>() != null ||
                endpoint?.Metadata?.GetMetadata<SkipPermissionCheckAttribute>() != null)
            {
                await next();
                return;
            }

            var httpContext = context.HttpContext;

            // ── Rule 1: Only GET requests can possibly be checked ──
            if (!HttpMethods.IsGet(httpContext.Request.Method))
            {
                await next();
                return;
            }

            // ── Rule 2: Only real browser navigation counts — not AJAX/fetch GET calls ──
            string secFetchMode = httpContext.Request.Headers["Sec-Fetch-Mode"].ToString();
            string requestedWith = httpContext.Request.Headers["X-Requested-With"].ToString();

            bool isRealBrowserNavigation =
                string.Equals(secFetchMode, "navigate", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(requestedWith, "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);

            if (!isRealBrowserNavigation)
            {
                await next(); // AJAX GET (dropdowns, search, etc.) — skip
                return;
            }

            // ── From here: confirmed real page load in the browser address/menu ──
            if (httpContext.User?.Identity?.IsAuthenticated != true)
            {
                await next();
                return;
            }

            var idClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)
                          ?? httpContext.User.FindFirst("UserId");

            if (idClaim == null || !int.TryParse(idClaim.Value, out int userId) || userId <= 0)
            {
                RedirectToAccessDenied(context, "Unable to verify user identity.");
                return;
            }

            var controllerName = (context.ActionDescriptor as ControllerActionDescriptor)?.ControllerName;
            var actionName = (context.ActionDescriptor as ControllerActionDescriptor)?.ActionName;

            // Action names that represent CRUD operations on the same module/page —
            // don't append these to the URL, since permissions are checked at the
            // module/page level, not per CRUD action.
            var excludedActions = new[] { "Add", "Edit", "Delete", "View", "Create", "Update", "Remove", "Student" };

            string moduleUrl;
            if (!string.IsNullOrEmpty(actionName) &&
                excludedActions.Any(a => actionName.StartsWith(a, StringComparison.OrdinalIgnoreCase)))
            {
                // e.g. "/Library" instead of "/Library/Add" or "/Library/EditBook"
                moduleUrl = $"/{controllerName}";
            }
            else
            {
                // e.g. "/Library/BarCodeLabels" for distinct pages/views
                moduleUrl = $"/{controllerName}/{actionName}";
            }

            string[] skipPrefixes = { "/Account", "/Error", "/Site", "/Home" };
            if (skipPrefixes.Any(p => moduleUrl.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                await next();
                return;
            }

            // ── Rule: a role's own dashboard is always accessible, skip permission lookup ──
            if (_permHelper.IsOwnDashboard(moduleUrl))
            {
                await next();
                return;
            }

            // ── Determine which permission to check ──
            string requiredPermission = ResolveRequiredPermission(context, httpContext);

            await _permHelper.LoadPermissions(userId);

            bool hasAccess = _permHelper.HasPermissionByUrl(moduleUrl, requiredPermission);

            if (!hasAccess)
            {
                RedirectToAccessDenied(context, "User does not have permission to access this page.");
                return;
            }

            await next();
        }

        private string ResolveRequiredPermission(ActionExecutingContext context, HttpContext httpContext)
        {
            var explicitAttr = context.ActionDescriptor.EndpointMetadata
                .OfType<RequirePermissionAttribute>()
                .FirstOrDefault();
            if (explicitAttr != null) return explicitAttr.PermissionName;

            var actionName = (context.ActionDescriptor as ControllerActionDescriptor)?.ActionName ?? "";

            if (actionName.StartsWith("Delete", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Remove", StringComparison.OrdinalIgnoreCase))
                return "Delete";

            if (actionName.StartsWith("Add", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Create", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Insert", StringComparison.OrdinalIgnoreCase))
                return "Add";

            if (actionName.StartsWith("Edit", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Update", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Upsert", StringComparison.OrdinalIgnoreCase) ||
                actionName.StartsWith("Toggle", StringComparison.OrdinalIgnoreCase))
                return "Edit";

            if (actionName.StartsWith("Export", StringComparison.OrdinalIgnoreCase)) return "Export";
            if (actionName.StartsWith("Print", StringComparison.OrdinalIgnoreCase)) return "Print";
            if (actionName.StartsWith("Import", StringComparison.OrdinalIgnoreCase)) return "Import";

            if (HttpMethods.IsPost(httpContext.Request.Method)) return "Add";
            if (HttpMethods.IsPut(httpContext.Request.Method) || HttpMethods.IsPatch(httpContext.Request.Method)) return "Edit";

            return "View";
        }

        private void RedirectToAccessDenied(ActionExecutingContext context, string message)
        {
            context.HttpContext.Response.StatusCode = 404;
            context.Result = new RedirectToActionResult("AccessDenied", "Error", new { message });
        }
    }
}