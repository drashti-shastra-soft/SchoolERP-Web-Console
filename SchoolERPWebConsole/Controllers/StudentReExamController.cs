using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class StudentReExamController : BaseController
    {
        private readonly IStudentReExamClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classService;
        private readonly ISubjectGroupClientService _subjectGroupClient;
        private readonly IExamConfigClientService _examConfigClient;
        private readonly IExamGradeClientService _examGradeClient;
        private readonly ICoScholasticClientService _coScholasticClient;

        public StudentReExamController(
            IStudentReExamClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classService,
            ISubjectGroupClientService subjectGroupClient,
            IExamConfigClientService examConfigClient,
            IExamGradeClientService examGradeClient,
            ICoScholasticClientService coScholasticClient) : base(permHelper)
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


        public async Task<IActionResult> Index()
        {
            var model = new StudentReExamAddViewModel();
            try
            {
                var perms = await GetPermissions("/StudentReExam/Index");

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
        public async Task<IActionResult> GetExamList(int classId)
        {
            try
            {
                if (classId <= 0)
                    return Json(new { success = false, message = "Class is required." });

                var exam = await _examConfigClient.GetExamConfigByClassAsync(
                    await GetCompanyId(), await GetSessionId(), classId);

                return Json(new { success = true, data = exam?.Data ?? new List<ExamConfigViewModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> GetGridData([FromBody] StudentReExamGetList request)
        {
            try
            {
                if (request.ClassID <= 0 || request.SectionID <= 0 || request.ExamGroupID <= 0)
                    return Json(new { success = false, message = "Class, Section and Exam are required." });

                var req = new StudentReExamRequestModel
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId(),
                    ClassID = request.ClassID,
                    SectionID = request.SectionID,
                    ExamGroupID = request.ExamID
                };

                var response = await _client.GetAllStudentReExamAsync(req);

                return Json(new { success = true, data = response?.Data ?? new List<StudentReExamViewModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveRemarksFeeding([FromBody] StudentReExamRequest req)
        {
            try
            {
                if (req == null || req.ClassID <= 0 || req.SectionID <= 0 || req.ExamGroupID <= 0)
                    return Json(new { success = false, message = "Class, Section and Exam are required." });

                if (req.Rows == null || req.Rows.Count == 0)
                    return Json(new { success = false, message = "There are no rows to save." });

                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
                req.UserId = GetStaffID() ?? 0;
                req.IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                var response = await _client.UpsertStudentReExamAsync(req);

                return Json(new { response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ---------------------------------------------------------------
        // Deletes the checked rows only (each id is a RemarksFeedingID).
        // Rows that were never saved (id <= 0) are filtered out client-side
        // before this is called.
        // ---------------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> DeleteRemarksFeeding([FromBody] List<int> ids)
        {
            try
            {
                if (ids == null || ids.Count == 0)
                    return Json(new { success = false, message = "Please select at least one row to delete." });

                var response = await _client.DeleteAsync(ids);

                return Json(new { response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
