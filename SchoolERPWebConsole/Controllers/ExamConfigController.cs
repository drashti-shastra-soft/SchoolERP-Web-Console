using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class ExamConfigController : BaseController
    {
        private readonly IExamConfigClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IExamClientService _examService;
        private readonly IExamGroupClientService _examGroupService;
        private readonly IClassClientService _classClient;
        public ExamConfigController(
            IExamConfigClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IExamClientService examService,
            IExamGroupClientService examGroupService,
            IClassClientService classClient) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _examService = examService;
            _examGroupService = examGroupService;
            _classClient = classClient;
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

        public async Task<IActionResult> Index(ExamConfigListRequest request)
        {
            var model = new ExamConfigPageViewModel();
            try
            {
                model = await BuildExamConfigPageViewModel(request);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetExamConfigPartial(ExamConfigListRequest request)
        {
            try
            {
                var model = await BuildExamConfigPageViewModel(request);

                return PartialView("_ExamConfigTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ExamConfigTablePartial", new ExamConfigPageViewModel());
            }
        }


        private async Task<ExamConfigPageViewModel> BuildExamConfigPageViewModel(ExamConfigListRequest request)
        {
            var model = new ExamConfigPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/ExamConfig/Index");


                
                var companyId = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                var sessionId = request.SessionID > 0 ? request.SessionID : await GetSessionId();
                request.CompanyID = companyId;
                request.SessionID = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                // ── Parallel fetch — dropdowns + paged subjects ─────────────────
                var subjectTask = _client.GetAllExamConfigWithPageAsync(request);
                var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
                var classTask = _classClient.GetAllAsync(false, request.SessionID,request.CompanyID, staffId);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(subjectTask, sessionTask, companiesTask, classTask);

                var pagedResult = await subjectTask;

                model = new ExamConfigPageViewModel
                {
                    Exam = pagedResult.Success ? pagedResult.Data.Data : new List<ExamConfigViewModel>(),
                    Classes = (await classTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = request.SearchText,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    ClassId=request.ClassID,
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new()
                };
                model.Permissions = perms;

                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return model;
            }

        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new ExamConfigAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                var examsResponse = await _examService.GetAllAsync(companyId, sessionId);
                var examGroupResponse = await _examGroupService.GetAllAsync(companyId, sessionId);
                var classesResponse = await _classClient.GetAllAsync(false, sessionId, companyId, staffId);
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditExam = response.Data;
                    }
                }
                else
                {
                    model.EditExam = null;
                }
                model.Classes = classesResponse.Data ?? new List<MstClassViewModel>();
                model.Exam= examsResponse.Data ?? new List<ExamViewModel>();
                model.ExamGroup = examGroupResponse.Data ?? new List<ExamGroupViewModel>();
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
        public async Task<IActionResult> Save([FromBody] ExamConfigRequest request)
        {
            try
            {
                if (request.SessionID == 0)
                    request.SessionID = await GetSessionId();

                if (request.CompanyID == 0)
                    request.CompanyID = await GetCompanyId();

                request.UserId = int.Parse(
                    User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0"
                );

                var response = await _client.UpsertAsync(request);

                return Json(new
                {
                    success = response.Success,
                    message = response.Message
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

       

        // ── Class list, scoped to company + session ─────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetClassList(int companyId, int sessionId)
        {
            try
            {
                if (companyId == 0) companyId = await GetCompanyId();
                if (sessionId == 0) sessionId = await GetSessionId();
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                var response = await _classClient.GetAllAsync(false,companyId, sessionId, staffId);
                return Json(new { success = true, data = response?.Data ?? new List<MstClassViewModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ── Preview rows for the source session/class ───────────────────────
        [HttpGet]
        public async Task<IActionResult> GetGradePreview(int companyId, int sessionId, int classId)
        {
            try
            {
                if (companyId == 0) companyId = await GetCompanyId();
                if (sessionId == 0) sessionId = await GetSessionId();

                if (classId <= 0)
                    return Json(new { success = false, message = "Class is required." });

                var response = await _client.GetExamConfigByClassAsync(companyId, sessionId, classId);
                return Json(new { success = true, data = response?.Data ?? new List<ExamConfigViewModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ── Copy ────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> CopyExamConfig([FromBody] ExamConfigCopyRequest request)
        {
            try
            {
                if (request == null)
                    return Json(new { success = false, message = "Invalid request." });

                if (request.CompanyID == 0) request.CompanyID = await GetCompanyId();
                if (request.FromSessionID == 0) request.FromSessionID = await GetSessionId();

                if (request.FromSessionID <= 0 || request.FromClassID <= 0)
                    return Json(new { success = false, message = "Source Session and Class are required." });

                if (request.ToSessionID <= 0 || string.IsNullOrWhiteSpace(request.ToClassIDs))
                    return Json(new { success = false, message = "Destination Session and Class are required." });

                // "5,4,1" -> [5,4,1]  (ignores blanks / junk, de-dupes)
                var toClassIds = request.ToClassIDs
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => int.TryParse(x.Trim(), out var id) ? id : 0)
                    .Where(id => id > 0)
                    .Distinct()
                    .ToList();

                if (!toClassIds.Any())
                    return Json(new { success = false, message = "Destination Class list is invalid." });

                // Same session -> the source class itself is not a valid target.
                if (request.FromSessionID == request.ToSessionID)
                {
                    toClassIds.Remove(request.FromClassID);

                    if (!toClassIds.Any())
                        return Json(new { success = false, message = "Source and destination cannot be the same." });
                }

                // Normalise back so the service always gets a clean list.
                request.ToClassIDs = string.Join(",", toClassIds);

                request.UserId = GetStaffID() ?? 0;
                request.IPAddress = HttpContext?.Connection?.RemoteIpAddress?.ToString();

                var response = await _client.CopyExamConfigAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
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
