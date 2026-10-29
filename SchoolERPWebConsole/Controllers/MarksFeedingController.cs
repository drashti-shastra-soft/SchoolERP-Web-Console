using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    // =====================================================================
    // ASSUMPTIONS (adjust to match your real project if names differ):
    //
    // IMarksFeedingClientService needs THREE methods that are not shown in
    // what you sent - please add these to the interface / implementation:
    //
    //   Task<ApiResponse<List<MarksFeedingResponse>>> GetAllMarksFeedingBindGridAsync(MarksFeedingGetRequest req);
    //   Task<ApiResponse<bool>> SaveMarksFeedingAsync(MarksFeedingRequest req);
    //   Task<ApiResponse<bool>> DeleteMarksFeedingAsync(MarksFeedingGetRequest req);
    //
    // (ApiResponse<T> stands in for whatever your generic wrapper type is
    //  called - I copied the ".Data" access pattern already used elsewhere
    //  in this controller.)
    //
    // SubjectWithPaperMarksResponse (returned by GetAllExamBySubjectIdList)
    // is assumed to look like:
    //
    //   public class SubjectWithPaperMarksResponse
    //   {
    //       public int ExamID { get; set; }
    //       public string ExamName { get; set; }
    //       public string ExamGroupName { get; set; }
    //       public decimal TheoryMaxMark { get; set; }
    //       public decimal TheoryMinMark { get; set; }
    //       public decimal PracticalMaxMark { get; set; }
    //       public decimal PracticalMinMark { get; set; }
    //   }
    //
    // If your real property names differ, only MarksFeeding.js needs
    // updating (it reads exam.examID / exam.theoryMaxMark / etc.).
    // =====================================================================
    public class MarksFeedingController : BaseController
    {
        private readonly IMarksFeedingClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classService;
        private readonly ISubjectGroupClientService _subjectGroupClient;
        private readonly IExamConfigClientService _examConfigClient;
        public MarksFeedingController(
            IMarksFeedingClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classService,
            ISubjectGroupClientService subjectGroupClient,
            IExamConfigClientService examConfigClient) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _classService = classService;
            _subjectGroupClient = subjectGroupClient;
            _examConfigClient = examConfigClient;
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

        public async Task<IActionResult> Index(MarksFeedingGetRequest req)
        {
            var model = new MarksFeedingAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/MarksFeeding/Index"
               );

                var sessionId = await GetSessionId();

                // ASSUMPTION: IClassClientService exposes a method to list
                // classes for the class dropdown, matching the pattern used
                // by the sibling PaperMarksDetails screen. Adjust the method
                // name/signature to whatever _classService actually exposes.
                var classResponse = await _classService.GetAllAsync(false, sessionId, await GetCompanyId());
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
        public async Task<IActionResult> GetSubjectByClassandSectionId(int classId, int sectionId)
        {
            try
            {

                if (classId <= 0)
                    return Json(new { success = false, message = "Class is required." });


                var subject = await _subjectGroupClient.GetAllSubjectByClassandSectionIdAsync(await GetCompanyId(), await GetSessionId(), classId, sectionId);

                return Json(new { success = true, data = subject?.Data ?? new List<DropdownModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllExamBySubjectIdList(int classId, int subjectId)
        {
            try
            {

                if (classId <= 0)
                    return Json(new { success = false, message = "Class is required." });


                var subject = await _examConfigClient.GetAllExamBySubjectIdListAsync(await GetCompanyId(), await GetSessionId(), classId, subjectId);

                return Json(new { success = true, data = subject?.Data ?? new List<SubjectWithPaperMarksResponse>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ---------------------------------------------------------------
        // Loads the student grid (roll no, SR code, name, existing marks
        // and attendance status) for the selected Class/Section/Subject/Exam.
        // Mirrors GetSubjectByClassandSectionId's pattern.
        // ---------------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetGridData(int classId, int sectionId, int subjectId, int examId)
        {
            try
            {
                if (classId <= 0 || sectionId <= 0 || subjectId <= 0 || examId <= 0)
                    return Json(new { success = false, message = "Class, Section, Subject and Exam are required." });

                var req = new MarksFeedingGetRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId(),
                    ClassID = classId,
                    SectionID = sectionId,
                    SubjectID = subjectId,
                    ExamID = examId
                };

                var response = await _client.GetAllMarksFeedingBindGridAsync(req);

                return Json(new { success = true, data = response?.Data ?? new List<MarksFeedingResponse>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ---------------------------------------------------------------
        // Saves marks/attendance status for every row currently in the grid.
        // ---------------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> SaveMarksFeeding([FromBody] MarksFeedingRequest req)
        {
            try
            {
                if (req == null || req.ClassID <= 0 || req.SectionID <= 0 || req.SubjectID <= 0 || req.ExamID <= 0)
                    return Json(new { success = false, message = "Class, Section, Subject and Exam are required." });

                if (req.Rows == null || req.Rows.Count == 0)
                    return Json(new { success = false, message = "There are no rows to save." });

                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
                req.UserId = GetStaffID() ?? 0;
                req.IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                var response = await _client.UpsertMarksFeedingAsync(req);

                var success = response?.Data ?? false;
                return Json(new { response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ---------------------------------------------------------------
        // Clears saved marks/attendance for the selected Class/Section/
        // Subject/Exam (i.e. resets the exam back to "not fed" for this
        // group of students).
        // ---------------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> DeleteMarksFeeding([FromBody] List<int> ids)
        {
            try
            {
                
                var response = await _client.DeleteAsync(ids);

                var success = response?.Data ?? false;
                return Json(new { response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}