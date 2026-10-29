using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class RemarkEntryController : BaseController
    {
        private readonly IRemarkEntryClientService _client;
        private readonly IRemarkGroupClientService _remarkGroup;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        public RemarkEntryController(
            IRemarkEntryClientService client,
            IRemarkGroupClientService remarkGroup,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _remarkGroup = remarkGroup;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
        }
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == default(int))
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionClient.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        /// <summary>
        /// Shows the 'Subject' management page where you can define, search, and filter all subjects taught in the school.
        /// Use this to manage all subjects, including pagination and filtering.
        /// </summary>
        // Full page load
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, bool? isActive, int? userTypeId)
        {
            var model = new RemarkPageViewModel();
            try
            {
                model = await BuildRemarkPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, isActive, userTypeId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ NEW — AJAX endpoint, returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetRemarkPartial(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, bool? isActive, int? userTypeId)
        {
            try
            {
                var model = await BuildRemarkPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, isActive, userTypeId);

                return PartialView("_RemarkTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_RemarkTablePartial", new RemarkPageViewModel());
            }
        }

        // ✅ NEW — shared logic extracted from the original Subject() action, unchanged internally
        private async Task<RemarkPageViewModel> BuildRemarkPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, bool? isActive, int? userTypeId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/RemarkEntry/Index");

            var request = new SubjectSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? await GetSessionId()
            };

            var sessionId = await GetSessionId();

            // ── Parallel fetch — dropdowns + paged subjects ─────────────────
            var subjectTask = _client.GetAllRemarkWithPageAsync(request);
            var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(subjectTask, sessionTask, companiesTask);

            var pagedResult = await subjectTask;

            var model = new RemarkPageViewModel
            {
                Remark = pagedResult.Success ? pagedResult.Data.Data : new List<RemarkMasterViewModel>(),
                TotalRecords = pagedResult.Data.TotalRecords,
                //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                CompanyId = request.CompanyID,
                SessionId = request.SessionID,
                Companies = (await companiesTask).Data ?? new(),
                Sessions = (await sessionTask).Data ?? new()
            };
            model.Permissions = perms;

            return model;
        }


        /// <summary>
        /// Creates or updates a subject record.
        /// Use this to add a new subject or edit an existing one.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveRemark([FromBody] RemarkMasterRequest request)
        {
            try
            {
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Shows the add/edit form for a subject.
        /// Use this to display the UI for creating or editing a subject.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new RemarkAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var remarkGroupsTask = _remarkGroup.GetSubjectsTypeDropdownListAsync(await GetCompanyId(), sessionId);
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditRemark = response.Data;
                    }
                }
                else
                {
                    model.EditRemark = null;
                }
                model.RemarkGroup= (await remarkGroupsTask).Data ?? new();
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                var response = await _client.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _client.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
