using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class SMSTemplateController : BaseController
    {
        // Permission key used for both the list page and the add/edit page.
        private const string PermissionPath = "/SMSTemplate/Index";

        private readonly ISMSTemplateClientService _client;
        private readonly ICompanyClientService _companyService;

        /// <summary>
        /// Initializes a new instance of the <see cref="SMSTemplateController"/> class.
        /// </summary>
        public SMSTemplateController(ISMSTemplateClientService client,
            ICompanyClientService companyService,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
        }

        /// <summary>
        /// Gets the current company ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetCompanyId()
        {
            int current = Convert.ToInt32(CurrentCompanyId);   // works for int and int?
            if (current > 0)
                return current;

            var response = await _companyService.GetUserCurrentCompanyAsync();
            return response?.Data ?? 0;
        }

        /// <summary>
        /// Gets the logged-in user's id from the auth claims (0 if not found).
        /// </summary>
        private int GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("UserId");
            return int.TryParse(claim?.Value, out var id) ? id : 0;
        }

        /// <summary>
        /// Builds the view model for the SMS Template list page (permissions, companies, templates).
        /// </summary>
        
        private async Task<SMSTemplatePageViewModel> BuildSMSTemplatePageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            var model = new SMSTemplatePageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/AccountType/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var itemCategory = _client.GetAllSMSTemplateWithPageAsync(request);

                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory,  companiesTask);

                var pagedResult = await itemCategory;

                model = new SMSTemplatePageViewModel
                {
                    SMSTemplate = pagedResult.Success ? pagedResult.Data.Data : new List<SMSTemplateViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID
                };

                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {

                throw;
            }

        }

        /// <summary>
        /// Displays the main SMS Template list page.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            var model = new SMSTemplatePageViewModel();
            try
            {
                model = await BuildSMSTemplatePageViewModel(pageIndex, pageSize, search, companyId);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the table partial (AJAX endpoint for filter / search / paging).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSMSTemplatePartial(int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            try
            {
                var model = await BuildSMSTemplatePageViewModel(pageIndex, pageSize, search, companyId);
                return PartialView("_SMSTemplateTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_SMSTemplateTablePartial", new SMSTemplatePageViewModel());
            }
        }

        /// <summary>
        /// Add / Edit page. id = null or 0 -> add, id > 0 -> edit.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new SMSTemplateAddViewModel { EditSMSTemplate = null };
            try
            {
                model.Permissions = await GetPermissions(PermissionPath);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response != null && response.Success && response.Data != null)
                    {
                        model.EditSMSTemplate = response.Data;
                    }
                    else
                    {
                        TempData["Error"] = response?.Message ?? "SMS template not found.";
                    }
                }

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Deletes one or more SMS templates by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                if (ids == null || ids.Count == 0)
                    return Json(new { success = false, message = "Please select at least one SMS template." });

                var response = await _client.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Activates / deactivates one or more SMS templates.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (request == null)
                    return Json(new { success = false, message = "Invalid request." });

                var response = await _client.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates (SMSTemplateId = 0) or updates (SMSTemplateId > 0) an SMS template.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] SMSTemplateSaveRequest req)
        {
            try
            {
                if (req == null)
                    return Json(new { success = false, message = "Invalid request." });

                // Server-side validation (the JS check can be bypassed)
                req.Title = (req.Title ?? string.Empty).Trim();
                req.Message = (req.Message ?? string.Empty).Trim();

                if (req.Title.Length == 0)
                    return Json(new { success = false, message = "SMS title is required." });

                if (req.Message.Length == 0)
                    return Json(new { success = false, message = "SMS message is required." });

                if (req.Title.Length > 500)
                    return Json(new { success = false, message = "SMS title cannot exceed 500 characters." });

                req.DisplayLabel = string.IsNullOrWhiteSpace(req.DisplayLabel)
                    ? req.Title
                    : req.DisplayLabel.Trim();

                if (req.DisplayLabel.Length > 500)
                    return Json(new { success = false, message = "Display name cannot exceed 500 characters." });

                if (req.CompanyID == null || req.CompanyID == 0)
                    req.CompanyID = await GetCompanyId();

                // The SP needs these for history + audit
                req.UserId = GetLoggedInUserId();
                req.IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                var r = await _client.UpsertSMSTemplateAsync(req);

                if (r == null || !r.Success || r.Data == null)
                    return Json(new { success = false, message = r?.Message ?? "Unable to save SMS template." });

                // SP returns RESULT = 1 on success, 0 on validation/DB failure
                return Json(new { success = r.Data.Result == 1, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}