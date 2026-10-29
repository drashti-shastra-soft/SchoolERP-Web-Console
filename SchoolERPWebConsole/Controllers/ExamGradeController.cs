using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class ExamGradeController : BaseController
    {
        private readonly IExamGradeClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IClassClientService _classClient;
        private readonly ISubjectTypeClientService _subjectTypeclient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        public ExamGradeController(
            IExamGradeClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classClient,
            ISubjectTypeClientService subjectTypeclient) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _classClient = classClient;
            _subjectTypeclient = subjectTypeclient;
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

        public async Task<IActionResult> Add(int? subjectTypeId, int? classId)
        {
            var model = new ExamGradeAddViewModel();
            try
            {
                var perms = await GetPermissions("/ExamGrade/Add");
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;

                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                var classesTask = await _classClient.GetAllAsync(false, sessionId, companyId, staffId);
                var subjectType = await _subjectTypeclient.GetSubjectsTypeDropdownListAsync(companyId,sessionId);

                model.Classes = classesTask.Data ?? new List<MstClassViewModel>();
                model.SubjectType = subjectType.Data ?? new List<DropdownModel>();
                model.Permissions = perms;
                model.CompanyID = companyId;
                model.SessionID = sessionId;
                model.CurrentUserId = staffId ?? 0;

                // Deep-link support: /ExamGrade/Add?subjectTypeId=2&classId=5
                // pre-selects the dropdowns; the grid itself is loaded client-side via GetByFilter.
                model.SelectedSubjectTypeID = subjectTypeId ?? 0;
                model.SelectedClassID = classId ?? 0;

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // -----------------------------------------------------------------
        // AJAX endpoint the JS calls whenever Subject Type + Class changes.
        // -----------------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetByFilter(int companyId, int sessionId, int subjectTypeId, int classId)
        {
            try
            {
                var response = await _client.GetByFilterAsync(companyId, sessionId, subjectTypeId, classId);
                return Json(new { success = response.Success, message = response.Message, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, data = (object)null });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] ExamGradeRequest request)
        {
            try
            {
                if (request.SessionID == 0)
                {
                    request.SessionID = await GetSessionId();
                }
                if (request.CompanyID == 0)
                {
                    request.CompanyID = await GetCompanyId();
                }

                if (request.SubjectTypeID <= 0 || request.ClassID <= 0)
                {
                    return Json(new { success = false, message = "Subject Type and Class are required." });
                }

                if (request.GradeRows == null || request.GradeRows.Count == 0)
                {
                    return Json(new { success = false, message = "At least one grade row is required." });
                }

                var response = await _client.UpsertAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyExamGrade([FromBody] ExamGradeCopyRequest request)
        {
            try
            {
                if (request.CompanyID == 0) request.CompanyID = await GetCompanyId();
                if (request.SessionID == 0) request.SessionID = await GetSessionId();

                if (request.FromSubjectTypeID <= 0 || request.FromClassID <= 0)
                {
                    return Json(new { success = false, message = "Source Subject Type and Class are required." });
                }
                if (request.ToSubjectTypeID <= 0 || request.ToClassID <= 0)
                {
                    return Json(new { success = false, message = "Destination Subject Type and Class are required." });
                }
                if (request.FromSubjectTypeID == request.ToSubjectTypeID && request.FromClassID == request.ToClassID)
                {
                    return Json(new { success = false, message = "Source and destination cannot be the same." });
                }

                var staffId = GetStaffID();
                request.UserId = staffId ?? 0;

                var response = await _client.CopyExamGradeAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------
        // Preview endpoint the modal uses to show what will be copied,
        // keyed by SubjectType + Class instead of Company + Session.
        // -----------------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetGradePreview(int subjectTypeId, int classId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _client.GetByFilterAsync(companyId, sessionId, subjectTypeId, classId);
                return Json(new { success = response.Success, message = response.Message, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, data = (object)null });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSubjectTypeList(int companyId, int sessionId)
        {
            try
            {
               
                var response = await _subjectTypeclient.GetSubjectsTypeDropdownListAsync(companyId, sessionId);
                return Json(new { success = response.Success, message = response.Message, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, data = (object)null });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetClassList(int companyId, int sessionId)
        {
            try
            {
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                var response = await _classClient.GetAllAsync(false, sessionId, companyId, staffId);
                return Json(new { success = response.Success, message = response.Message, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, data = (object)null });
            }
        }
    }
}
