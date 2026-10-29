using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Attributes;

namespace SchoolERPWebConsole.Controllers
{
    public class ErrorController : Controller
    {
        [SkipPermissionCheck]
        [AllowAnonymous]
        public IActionResult AccessDenied(string message)
        {
            Response.StatusCode = 404;
            ViewBag.Message = string.IsNullOrWhiteSpace(message)
                ? "User not permission to access this page"
                : message;
            return View(); // Views/Error/AccessDenied.cshtml
        }

        [SkipPermissionCheck]
        [AllowAnonymous]
        public IActionResult NotFound404()
        {
            Response.StatusCode = 404;
            return View();
        }
    }
}
