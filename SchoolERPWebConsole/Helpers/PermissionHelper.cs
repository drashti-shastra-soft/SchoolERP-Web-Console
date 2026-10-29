using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebConsole.Helpers
{
    public class PermissionHelper
    {
        private readonly IUserManagementClientService _userMgmtService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private List<UserPermissionViewModel>? _userPermissions = null;
        private bool _isSuperAdmin = false;
        private string? _userTypeName = null;

        // One dashboard URL per role. Keep this in sync with the actual
        // controller/action route for each role's dashboard page.
        private static readonly Dictionary<string, string> RoleDashboardMap =
            new(StringComparer.OrdinalIgnoreCase)
        {
            { "SuperAdmin", "/Dashboard/Index" },
            { "Admin",      "/Dashboard/Index" },
            { "Teacher",    "/Dashboard/Index" },
            { "Student",    "/Dashboard/Student" },
            { "Parent",    "/Dashboard/Student" },
            { "HR",         "/Dashboard/Index" },
        };

        public PermissionHelper(IUserManagementClientService userMgmtService, IHttpContextAccessor httpContextAccessor)
        {
            _userMgmtService = userMgmtService;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetRoleId()
        {
            var roleIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("RoleId");
            int.TryParse(roleIdClaim?.Value, out int roleId);
            return roleId; // returns 0 if claim missing or invalid
        }

        private string GetUserTypeName()
        {
            if (_userTypeName != null) return _userTypeName;
            _userTypeName = _httpContextAccessor.HttpContext?.User.FindFirst("UserTypeName")?.Value ?? "";
            return _userTypeName;
        }

        public async Task LoadPermissions(int userId)
        {
            if (_userPermissions == null)
            {
                _isSuperAdmin = IsSuperAdmin(_httpContextAccessor.HttpContext?.User);
                if (_isSuperAdmin)
                {
                    _userPermissions = new List<UserPermissionViewModel>();
                    return;
                }
                int roleid = GetRoleId();
                _userPermissions = (await _userMgmtService.GetUserPermissions(userId, roleid)).Data;
            }
        }

        public bool HasPermission(int menuId, string permissionName)
        {
            if (_isSuperAdmin) return true;
            if (_userPermissions == null) return false;
            return _userPermissions.Any(p => p.MenuID == menuId && p.PermissionName.Equals(permissionName, System.StringComparison.OrdinalIgnoreCase));
        }

        public bool HasPermissionByKey(string menuKey, string permissionName)
        {
            if (_isSuperAdmin) return true;
            if (_userPermissions == null) return false;
            return _userPermissions.Any(p => p.MenuKey.Equals(menuKey, System.StringComparison.OrdinalIgnoreCase) && p.PermissionName.Equals(permissionName, System.StringComparison.OrdinalIgnoreCase));
        }

        public bool HasPermissionByUrl(string menuUrl, string permissionName)
        {
            if (_isSuperAdmin) return true;
            if (_userPermissions == null || string.IsNullOrWhiteSpace(menuUrl)) return false;
            var key = menuUrl.Trim().TrimEnd('/');
            return _userPermissions.Any(p =>
                !string.IsNullOrEmpty(p.MenuURL) &&
                p.PermissionName.Equals(permissionName, System.StringComparison.OrdinalIgnoreCase) &&
                (p.MenuURL.Equals(key, System.StringComparison.OrdinalIgnoreCase) ||
                 p.MenuURL.StartsWith(key + "/", System.StringComparison.OrdinalIgnoreCase) ||
                 p.MenuURL.Contains(key, System.StringComparison.OrdinalIgnoreCase)));
        }

        public List<UserPermissionViewModel> GetPermissions() => _userPermissions ?? new List<UserPermissionViewModel>();

        // Returns the dashboard URL for the current user's role, or null if the
        // role isn't in the map. Use this to redirect after login.
        public string? GetOwnDashboardUrl(string? roleName = null)
        {
            var userTypeName = roleName;
            if (roleName == null)
            {
                userTypeName = GetUserTypeName();
            }
            if (string.IsNullOrWhiteSpace(userTypeName)) return null;
            return RoleDashboardMap.TryGetValue(userTypeName, out var url) ? url : null;
        }

        // True when pageUrl is exactly the dashboard belonging to the caller's own role.
        // Lets callers (e.g. PermissionAuthorizationFilter) skip a DB permission lookup
        // for the one page every authenticated role is always allowed to view.
        public bool IsOwnDashboard(string pageUrl)
        {
            if (string.IsNullOrWhiteSpace(pageUrl)) return false;

            var userTypeName = GetUserTypeName();
            if (string.IsNullOrWhiteSpace(userTypeName)) return false;

            if (!RoleDashboardMap.TryGetValue(userTypeName, out var dashboardUrl)) return false;

            var key = pageUrl.Trim().TrimEnd('/');
            return dashboardUrl.TrimEnd('/').Equals(key, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsSuperAdmin(ClaimsPrincipal? user)
        {
            if (user?.Identity?.IsAuthenticated != true) return false;

            return user.Claims.Any(c =>
                (string.Equals(c.Type, ClaimTypes.Role, System.StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "Role", System.StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "UserTypeName", System.StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "UserType", System.StringComparison.OrdinalIgnoreCase)) &&
                IsSuperAdminValue(c.Value));
        }

        private static bool IsSuperAdminValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            var normalized = value.Replace(" ", string.Empty)
                .Replace("-", string.Empty)
                .Replace("_", string.Empty)
                .Trim();
            return string.Equals(normalized, "SuperAdmin", System.StringComparison.OrdinalIgnoreCase);
        }



        public static class PagePermissionHelper
        {
            public static async Task<PagePermissions> Load(
                PermissionHelper permHelper,
                int userId,
                string pageUrl,
                string importUrl = null)
            {
                // If not logged in → return all false
                if (userId <= 0)
                    return PagePermissions.Denied;

                // Load once
                await permHelper.LoadPermissions(userId);

                // Every role can always view its own dashboard, regardless of
                // whatever granular Menu permissions are (or aren't) assigned to it.
                if (permHelper.IsOwnDashboard(pageUrl))
                {
                    return new PagePermissions
                    {
                        CanView = true,
                        CanAdd = false,
                        CanEdit = false,
                        CanDelete = false,
                        CanPrint = false,
                        CanExport = false,
                        CanImport = false,
                    };
                }

                return new PagePermissions
                {
                    CanView = permHelper.HasPermissionByUrl(pageUrl, "View"),
                    CanAdd = permHelper.HasPermissionByUrl(pageUrl, "Add"),
                    CanEdit = permHelper.HasPermissionByUrl(pageUrl, "Edit"),
                    CanDelete = permHelper.HasPermissionByUrl(pageUrl, "Delete"),
                    CanPrint = permHelper.HasPermissionByUrl(pageUrl, "Print"),
                    CanExport = permHelper.HasPermissionByUrl(pageUrl, "Export"),
                    CanImport = importUrl != null && permHelper.HasPermissionByUrl(importUrl, "Import"),
                };
            }
        }
    }
}