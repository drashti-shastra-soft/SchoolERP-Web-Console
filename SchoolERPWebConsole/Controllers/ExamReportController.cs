using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Linq;

namespace SchoolERPWebClient.Controllers
{
    public class ExamReportController : BaseController
    {
        private readonly IExamReportClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly PermissionHelper permHelper;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classService;

        // NOTE: no exam-group client service was supplied for this controller.
        // Injecting one here so GetExamGroupsByClass has somewhere real to call —
        // swap IExamGroupClientService / GetAllByClassAsync for whatever your
        // actual exam-group service interface/method is named.
        private readonly IExamGroupClientService _examGroupService;

        public ExamReportController(
            IExamReportClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classService,
            IExamGroupClientService examGroupService) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            this.permHelper = permHelper;
            _classService = classService;
            _examGroupService = examGroupService;
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

        public async Task<IActionResult> Termwisemarksreport()
        {
            var model = new ExamTermReportPageViewModel();
            try
            {
                var req = new ExamTermReportCardRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId(),
                };
                var perms = await GetPermissions("/Termwisemarksreport");

                // ClassID/ExamGroupID are 0 on first hit, so this will typically
                // come back empty until the user picks filters and hits Show Report.
                var examTermReport = await _client.GetExamTermReportCardAsync(req);
                model.ExamTermReportCard = examTermReport?.Data ?? new ExamTermReportCardResponse();

                var classResponse = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
                model.ClassList = classResponse?.Data ?? new List<MstClassViewModel>();

                model.CompanyID = req.CompanyID;
                model.SessionID = req.SessionID;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

      
        /// <summary>
        /// Called by "Show Report" in the view — fetches the full report-card
        /// payload for the selected Class/Section/Exam Group.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> GetReportCard([FromBody] ExamTermReportCardRequest request)
        {
            try
            {
                if (request == null)
                    return Json(new { success = false, message = "Request body is required." });

                if (request.SessionID <= 0)
                    request.SessionID = await GetSessionId();
                if (request.CompanyID <= 0)
                    request.CompanyID = await GetCompanyId();

                var response = await _client.GetExamTermReportCardAsync(request);
                return Json(new
                {
                    success = response?.Success ?? false,
                    data = response?.Data ?? new ExamTermReportCardResponse(),
                    message = response?.Message
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}