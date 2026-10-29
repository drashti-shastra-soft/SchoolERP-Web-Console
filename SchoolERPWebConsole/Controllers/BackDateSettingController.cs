using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Text.Json;


namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// Controller for managing back date attendance settings for staff.
    /// Handles listing, searching, adding, editing, and saving back date settings,
    /// as well as retrieving staff and user role information for configuration.
    /// </summary>
    public class BackDateSettingController : BaseController
    {
        private readonly IBackDateSettingClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IUserManagementClientService _userManagementClientService;
        private readonly IHumanResourceClientService _hrService;
        public BackDateSettingController(IBackDateSettingClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IUserManagementClientService userManagementClientService, IHumanResourceClientService hrService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _userManagementClientService = userManagementClientService;
            _hrService = hrService;
        }

        /// <summary>
        /// Retrieves the current company ID for the logged-in user.
        /// If not cached, fetches from the company service.
        /// Ensures all operations are performed in the correct company context.
        /// </summary>
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null) 
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }

        /// <summary>
        /// Retrieves the current session ID for the logged-in user.
        /// If not cached, fetches from the session service.
        /// Used to scope settings and staff lists to the correct academic/financial session.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
              

        /// <summary>
        /// Displays the Add/Edit Back Date Setting page for a specific staff member.
        /// Loads staff list, permissions, and any existing back date settings for the staff.
        /// If an ID is provided, loads the setting for editing; otherwise, prepares for a new entry.
        /// Also deserializes any existing role settings JSON for display and editing.
        /// </summary>
        public async Task<IActionResult> Add(int? id, int? staffId, int? userid)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var perms = await GetPermissions("/BackDateSetting/Add");

                var model = new BackDateSettingAddViewModel { Permissions = perms };

                var staffResponse = await _hrService.GetAllStaffAsync(companyId, sessionId, staffId);
                model.StaffList = staffResponse?.Data ?? new();

                model.EditBackDateSetting = new BackDateSettingViewModel
                {
                    StaffID = staffId ?? 0,
                    UserID = userid ?? 0
                };

                // ── Load this staff's existing role settings, if any ─────────────
                if (staffId.HasValue && staffId.Value > 0)
                {
                    var existing = await _client.GetAttendanceBackDateSettingByStaffIdAsync(staffId.Value);
                    if (existing.Success && existing.Data != null)
                    {
                        model.ExistingRoleSettings = string.IsNullOrWhiteSpace(existing.Data.RoleSettingsJson)
                            ? new List<AttendanceSettingModel>()
                            : JsonSerializer.Deserialize<List<AttendanceSettingModel>>(
                                  existing.Data.RoleSettingsJson,
                                  new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                              );
                    }
                }

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        /// <summary>
        /// Handles the creation or update of a back date setting for staff attendance.
        /// Accepts a SaveBackDateSettingRequest, ensures company context, and calls the client service to save.
        /// Returns a JSON result indicating success or failure, along with a message.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveBackDateSetting([FromBody] SaveBackDateSettingRequest request)
        {
            try
            {
                var isCreate = request.SettingID <= 0;
                request.CompanyID = await GetCompanyId();
                var response = await _client.UpsertBackDateSettingAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Displays the main Back Date Setting listing page.
        /// Handles pagination, search, company, and user type filters.
        /// Calls BuildSubjectPageViewModel to prepare the data and returns the view.
        /// If an error occurs, sets an error message in TempData and returns the view with an empty model.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search,
            int? companyId, bool? isActive, int? userTypeId)
        {
            var model = new BackDateSettingPageViewModel();
            try
            {
                model = await BuildSubjectPageViewModel(
                    pageIndex, pageSize, search, companyId,  isActive, userTypeId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// AJAX endpoint that returns only the back date setting table and pagination partial view.
        /// Used for dynamic updates of the settings list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBackDateSettingPartial(int? pageIndex, int? pageSize, string? search,
            int? companyId,  bool? isActive, int? userTypeId)
        {
            try
            {
                var model = await BuildSubjectPageViewModel(
                    pageIndex, pageSize, search, companyId,  isActive, userTypeId);

                return PartialView("_BackDateSettingTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SubjectTablePartial", new BackDateSettingPageViewModel());
            }
        }

        /// <summary>
        /// Builds the view model for the back date setting listing page.
        /// Fetches paged settings, companies, and permissions in parallel for performance.
        /// Prepares all data required to render the settings list, including staff attendance settings, companies, and permissions.
        /// </summary>
        private async Task<BackDateSettingPageViewModel> BuildSubjectPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
             bool? isActive, int? userTypeId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/BackDateSetting/Add");

            var request = new BackDateSettingSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
            };

           
            // ── Parallel fetch — dropdowns + paged subjects ─────────────────
            var subjectTask = _client.GetAllAttendanceBackDateSettingWithPageAsync(request);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(subjectTask, companiesTask);

            var pagedResult = await subjectTask;

            var model = new BackDateSettingPageViewModel
            {
                StaffAttendanceSettings = pagedResult.Success ? pagedResult.Data.Data : new List<BackDateSettingViewModel>(),
                TotalRecords = pagedResult.Data.TotalRecords,
                //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                CompanyId = request.CompanyID,
                Companies = (await companiesTask).Data ?? new()
            };
            model.Permissions = perms;

            return model;
        }

        /// <summary>
        /// Retrieves all roles assigned to a specific user by user ID.
        /// Calls the user management client service and returns the roles as JSON.
        /// Used for configuring role-based back date settings.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUserRole(int id)
        {
            try
            {
                var response = await _userManagementClientService.GetAllRolesByUserAsync(id);
                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
