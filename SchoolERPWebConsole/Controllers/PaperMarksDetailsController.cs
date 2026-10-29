using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using static System.Collections.Specialized.BitVector32;

namespace SchoolERPWebClient.Controllers
{
    public class PaperMarksDetailsController : BaseController
    {
        private readonly IPaperMarksDetailsClientService _client;
        private readonly IRemarkGroupClientService _remarkGroup;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IClassClientService _classService;
        private readonly IExamConfigClientService _examConfigClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        public PaperMarksDetailsController(
            IPaperMarksDetailsClientService client,
            IRemarkGroupClientService remarkGroup,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classService,
            IExamConfigClientService examConfigClient) : base(permHelper)
        {
            _client = client;
            _remarkGroup = remarkGroup;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _classService = classService;
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

        public async Task<IActionResult> Add(int? id)
        {
            var model = new PaperMarksDetailsAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var classResponse = await _classService.GetAllAsync(false,await GetSessionId(),await GetCompanyId());
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        //model.EditRemark = response.Data;
                    }
                }
                else
                {
                   //model.EditRemark = null;
                }
                model.Class = classResponse.Data;
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
        public async Task<IActionResult> SavePaperMarksDetails([FromBody] PaperMarksDetailsSaveRequest request)
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

        [HttpGet]
        public async Task<IActionResult> GetSubjectByClassandSectionId(int classId, int sectionId, int examId)
        {
            try
            {
                
                if (classId <= 0)
                    return Json(new { success = false, message = "Class is required." });

                
                var subject = await _examConfigClient.GetAllExamSubjectPaperMarksListAsync(await GetCompanyId(), await GetSessionId(), classId, sectionId, examId);
                
                return Json(new { success = true, data = subject?.Data ?? new List<SubjectWithPaperMarksResponse>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        [HttpPost]
        public async Task<IActionResult> CopyPaperMarksDetails([FromBody] PaperMarksDetailsCopyRequest request)
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
                var response = await _client.CopyPaperMarksDetailsAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
