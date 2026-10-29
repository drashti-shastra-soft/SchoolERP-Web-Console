using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class SubjectTypeController : BaseController
    {
        private readonly ISubjectTypeClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        public SubjectTypeController(
            ISubjectTypeClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm, 
            ICompanyClientService companyService, 
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
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
            var model = new MstSubjectTypePageViewModel();
            try
            {
                model = await BuildSubjectTypePageViewModel(
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
        public async Task<IActionResult> GetSubjectTypePartial(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, bool? isActive, int? userTypeId)
        {
            try
            {
                var model = await BuildSubjectTypePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, isActive, userTypeId);

                return PartialView("_SubjectTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SubjectTablePartial", new MstSubjectTypePageViewModel());
            }
        }

        // ✅ NEW — shared logic extracted from the original Subject() action, unchanged internally
        private async Task<MstSubjectTypePageViewModel> BuildSubjectTypePageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, bool? isActive, int? userTypeId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/SubjectType/Index");

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
            var subjectTask = _client.GetAllSubjectTypeWithPageAsync(request);
            var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(subjectTask, sessionTask, companiesTask);

            var pagedResult = await subjectTask;

            var model = new MstSubjectTypePageViewModel
            {
                Subjects = pagedResult.Success ? pagedResult.Data.Data : new List<SubjectTypeModel>(),
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
        public async Task<IActionResult> SaveSubject([FromBody] SubjectTypeRequest request)
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
            var model = new MstSubjectTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditSubjectsType = response.Data;
                    }
                }
                else
                {
                    model.EditSubjectsType = null;
                }

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

        /// <summary>
        /// Gets all account types for a given company and session.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(int companyId, int sessionId)
        {
            try
            {
                if (companyId == null || companyId == 0)
                {
                    companyId = await GetCompanyId();
                }
                if (sessionId == null || sessionId == 0)
                {
                    sessionId = await GetSessionId();
                }
                var response = await _client.GetAllAsync(companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Copies account types from one company/session to another.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CopySubjectType([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopySubjectTypeAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

    }
}
