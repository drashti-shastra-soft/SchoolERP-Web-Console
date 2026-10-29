using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Domain;
using static SchoolERPWebConsole.Helpers.PermissionHelper;

namespace SchoolERPWebConsole.Controllers
{
    public class BaseController : Controller
    {
        protected readonly PermissionHelper _permHelper;

        public BaseController(PermissionHelper permHelper)
        {
            _permHelper = permHelper;
        }

        // Call this in any action — one line!
        protected async Task<PagePermissions> GetPermissions(string pageUrl, string importUrl = null)
        {
            int userId = GetCurrentUserId();
            return await PagePermissionHelper.Load(_permHelper, userId, pageUrl, importUrl);
        }

        protected int GetCurrentUserId()
        {
            if (User.Identity == null || !User.Identity.IsAuthenticated)
                return 0;

            var claim = User.FindFirst(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("UserId");

            return claim != null && int.TryParse(claim.Value, out int id) ? id : 0;
        }

        protected int CurrentSessionId
        {
            //get
            //{
            //    if (Request.Cookies.TryGetValue("CurrentSessionId", out string val)
            //        && int.TryParse(val, out int id))
            //        return id;
            //    return 0;
            //}
            get
            {
                // 1. Get UserId from claims
                // 1. Get the UserTypeName claim
                var userTypeClaim = User.FindFirst("UserTypeName");

                // 2. Check role safely (null-check first, then compare .Value)
                //bool isStudent = userTypeClaim != null && userTypeClaim.Value == "Student";

                // equivalent alternative:
                // bool isStudent = User.FindFirst(ClaimTypes.Role)?.Value == "Student";

                //if (isStudent)
                //{
                //    // 3. Student's CompanyID isn't in the claims — look it up from DB by UserId
                //    //    (e.g. via your sp_Student_Get_ByUserID / a lightweight company-lookup SP)
                //    var sessionIdClaim = User.FindFirst("SessionID");
                //    int sessionID = (sessionIdClaim != null && int.TryParse(sessionIdClaim.Value, out int SessionID)) ? SessionID : 0;
                //    return sessionID; // returns int, 0 if not found
                //}

                // 4. Non-student (staff/admin) — fall back to the switchable cookie
                if (Request.Cookies.TryGetValue("CurrentSessionId", out string val)
                    && int.TryParse(val, out int id))
                    return id;

                return 0;
            }
        }

        protected int CurrentCompanyId
        {
            //get
            //{
            //    if (Request.Cookies.TryGetValue("CurrentCompanyId", out string val)
            //        && int.TryParse(val, out int id))
            //        return id;

            //    return 0;
            //}

            get
            {
                // 1. Get the UserTypeName claim
                var userTypeClaim = User.FindFirst("UserTypeName");

                // 2. Check role safely (null-check first, then compare .Value)
                bool isStudent = userTypeClaim != null && userTypeClaim.Value == "Student";

                if (isStudent)
                {
                    // 3. Student's CompanyID isn't in the claims — look it up from DB by UserId
                    //    (e.g. via your sp_Student_Get_ByUserID / a lightweight company-lookup SP)
                    var companyIDClaim = User.FindFirst("CompanyID");
                    int companyID = (companyIDClaim != null && int.TryParse(companyIDClaim.Value, out int CompanyID)) ? CompanyID : 0;
                    return companyID; // returns int, 0 if not found
                }

                // 4. Non-student (staff/admin) — fall back to the switchable cookie
                if (Request.Cookies.TryGetValue("CurrentCompanyId", out string val)
                    && int.TryParse(val, out int id))
                    return id;

                return 0;
            }
        }
    }
}
