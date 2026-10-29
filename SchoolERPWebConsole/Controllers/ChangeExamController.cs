using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;

namespace SchoolERPWebClient.Controllers
{
    public class ChangeExamController : BaseController
    {
        private readonly IChangeExamClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classService;
        private readonly ISubjectGroupClientService _subjectGroupClient;
        private readonly IExamConfigClientService _examConfigClient;
        private readonly IExamGradeClientService _examGradeClient;
        private readonly ICoScholasticClientService _coScholasticClient;
        private readonly IExamClientService _examclient;
        public ChangeExamController(
            IChangeExamClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classService,
            ISubjectGroupClientService subjectGroupClient,
            IExamConfigClientService examConfigClient,
            IExamGradeClientService examGradeClient,
            ICoScholasticClientService coScholasticClient,
            IExamClientService examclient) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _classService = classService;
            _subjectGroupClient = subjectGroupClient;
            _examConfigClient = examConfigClient;
            _examGradeClient = examGradeClient;
            _coScholasticClient = coScholasticClient;
            _examclient = examclient;
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

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] ExamMappingRequest req)
        {
            try
            {
                if (req == null || req.ClassID <= 0 || req.SectionID <= 0 || req.NewExamID <= 0)
                    return Json(new { success = false, message = "Class, Section and Exam are required." });

              
                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
                req.UserID = GetStaffID() ?? 0;

                var response = await _client.UpsertChangeExamAsync(req);

                return Json(new { response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> GetBindGrid([FromBody] ChangeExamRequest req)
        {
            try
            {
                //if (classId <= 0 || sectionId <= 0 || examId <= 0)
                //    return Json(new { success = false, message = "Class, Section and Exam are required." });

                //var req = new ChangeExamRequest
                //{
                //    CompanyID = await GetCompanyId(),
                //    SessionID = await GetSessionId(),
                //    ClassID = classId,
                //    SectionID = sectionId,
                //    ExamID = examId
                //};
                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
                var response = await _client.GetAllChangeExamAsync(req);

                return Json(new { success = true, data = response?.Data ?? new List<StudentResponse>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> Index()
        {
            var model = new ChangeExamAddViewModel();
            try
            {
                var perms = await GetPermissions("/ChangeExam/Index");

                var classResponse = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
                model.Class = classResponse?.Data ?? new List<MstClassViewModel>();

                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetNewExams(int classId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _examclient.GetAllAsync(companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
