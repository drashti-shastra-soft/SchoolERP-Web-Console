using Microsoft.AspNetCore.Mvc;
using Microsoft.SqlServer.Server;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the door to the application, handling when users try to log in or log out.
    /// </summary>
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class AuthController : Controller
    {
        private readonly IAuthClientService _authClient;
        private readonly IConfiguration _configuration;
        private readonly PermissionHelper _permHelper;

        public AuthController(IAuthClientService authClient, IConfiguration configuration, PermissionHelper permHelper)
        {
            _authClient = authClient;
            _configuration = configuration;
            _permHelper = permHelper;
        }

        /// <summary>
        /// Shows the login screen where you enter your username and password.
        /// </summary>
        public IActionResult Login()
        {
            ViewBag.ApiBaseUrl = _configuration["ApiSettings:BaseUrl"];
            // Simply return the default view without a model on first load.
            return View();
        }

        /// <summary>
        /// Takes the username and password you entered, checks if they are correct, and lets you into the system if they match.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Ensure the data annotations on the LoginRequest model are valid before making a network call.
            if (!ModelState.IsValid) return View(request);

            // Execute the backend API or service routine to validate credentials.
            var response = await _authClient.LoginAsync(request);

            // Check if the service returned a successful validation flag.
            if (response.Success)
            {
                string redirectUrl = "/Dashboard/Index"; // default fallback
                                                         // In a real application, the authentication cookie or JWT would be materialized here 
                                                         // e.g. HttpContext.SignInAsync(...)

                var dashboardUrl = _permHelper.GetOwnDashboardUrl(response.Data?.UserTypeName);

                if (!string.IsNullOrEmpty(dashboardUrl))
                    redirectUrl= dashboardUrl;
                //if (!string.IsNullOrEmpty(dashboardUrl))
                //    return Redirect(dashboardUrl);

                //if (response.Data?.UserTypeName == "Student") 
                //{
                //    redirectUrl = "/Dashboard/Student";
                //}
                //else if(response.Data?.UserTypeName == "Parent") 
                //{
                //    redirectUrl = "/Dashboard/Student";
                //}
                //else if (response.Data?.UserTypeName == "Teacher")
                //{
                //    redirectUrl = "/Teacher/Index";
                //}
                //else 
                //{
                //    redirectUrl = "/Dashboard/Index";
                //}
                //if (response.Data.DashboardURL != null)
                //{
                //    redirectUrl = response.Data.DashboardURL;
                //}
                // Route the successfully authenticated user into the secure system layout.
                return Json(new
                {
                    success = true,
                    message = response.Message,
                    redirectUrl = redirectUrl,
                    data = response.Data
                });
            }

            // Validation failed. Pass the failure string back to the user interface natively.
            ViewBag.ErrorMessage = response.Message;
            return Json(new
            {
                success = false,
                message = response.Message
            }); ;
        }

        /// <summary>
        /// Logs you out of the application and clears your session so you can safely leave the computer.
        /// </summary>
        public IActionResult Logout()
        {
            // Step 1: Tell the browser to throw away the 'token' and 'CurrentSessionId' which were like your temporary access badges.
            Response.Cookies.Delete("token");
            Response.Cookies.Delete("CurrentSessionId");

            // Step 2: Show a tiny logout screen that also cleans up any remaining traces from the browser's memory.
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> SwitchRole([FromBody] SwitchRoleRequest request)
        {
            // Ensure the data annotations on the LoginRequest model are valid before making a network call.
            if (!ModelState.IsValid) return View(request);

            // Execute the backend API or service routine to validate credentials.
            var response = await _authClient.SwitchRoleAsync(request);

            // Check if the service returned a successful validation flag.
            if (response.Success)
            {
                string redirectUrl = "/Dashboard/Index"; 

                
                // Route the successfully authenticated user into the secure system layout.
                return Json(new
                {
                    success = true,
                    message = response.Message,
                    redirectUrl = redirectUrl,
                    data = response.Data
                });
            }

            // Validation failed. Pass the failure string back to the user interface natively.
            ViewBag.ErrorMessage = response.Message;
            return Json(new
            {
                success = false,
                message = response.Message
            }); ;
        }

        #region Forgot Password

        // GET: /Account/ForgotPassword
        // Displays the Forgot Password page when the user clicks the link.
        [HttpGet]
        public IActionResult ForgotPassword()
        {
            return View("forgot-password-cover");
        }

        // POST: /Auth/ForgotPassword
        [HttpPost]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {   
                if (string.IsNullOrEmpty(request?.Email))
                    return Json(new { success = false, message = "Email is required." });

                var response = await _authClient.ForgotPasswordAsync(request);

                return Json(new
                {
                    success = response?.Success ?? false,
                    message = response?.Message ?? "Something went wrong."
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        
        public async Task<IActionResult> ResetPassword(string guid)
        {
            try
            {
                if (string.IsNullOrEmpty(guid))
                {
                    TempData["Error"] = "Invalid reset link.";
                    return RedirectToAction("ForgotPassword");
                }

                var response = await _authClient.ValidateTokenAsync(guid);
                if (response?.Success != true)
                {
                    TempData["Error"] = "This reset link is invalid or has expired.";
                    return RedirectToAction("ForgotPassword");
                }

                ViewBag.Guid = guid;
                return View("reset-password-cover");
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return RedirectToAction("ForgotPassword");
            }
        }

        // POST: /Auth/ResetPassword
        [HttpPost]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request?.NewPassword))
                    return Json(new { success = false, message = "Password is required." });

                if (request.NewPassword != request.ConfirmPassword)
                    return Json(new { success = false, message = "Passwords do not match." });

                if (string.IsNullOrEmpty(request.Guid))
                    return Json(new { success = false, message = "Invalid reset token." });

                var response = await _authClient.ResetPasswordAsync(request);

                return Json(new
                {
                    success = response?.Success ?? false,
                    message = response?.Message ?? "Something went wrong."
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        #endregion
    }
}
