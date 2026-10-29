using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;
using static System.Collections.Specialized.BitVector32;

namespace SchoolERPWebClient.Controllers
{
    public class ExamMarksheetDownloadPermissionController : BaseController
    {
        private readonly IExamMarksheetDownloadPermissionClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IExamClientService _examService;
        private readonly IExamGroupClientService _examGroupService;
        private readonly IClassClientService _classClient;
        public ExamMarksheetDownloadPermissionController(
            IExamMarksheetDownloadPermissionClientService client,
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
            var model = new PermissionAddViewModel();
            try
            {
                var perms = await GetPermissions("/RemarksFeeding/Index");

                var classResponse = await _classClient.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
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
        public async Task<IActionResult> GetAll(int companyId,int sessionId,int? classId,int examGroupId,int pageNo,int pageSize)
        {
            try
            {
               
                var request = new ExamGroupGetAllRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionId = await GetSessionId(),
                    ClassId = classId == 0 ? null : classId,
                    ExamGroupId = examGroupId == 0 ? null : examGroupId,
                    PageNo = pageNo,
                    PageSize=pageSize
                };
                var exam = await _client.GetAllExamMarksheetDownloadPermissionAsync(request);

                return Json(new { success = true, data = exam?.Data ?? new List<ExamMarksheetDownloadPermissionViewModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] PermissionRequest request)
        {
            try
            {
                if (request.SessionId == 0)
                    request.SessionId = await GetSessionId();

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

        [HttpPost]
        public async Task<IActionResult> SetAccess(
        [FromBody] ExamMarksheetDownloadPermissionSetAccessRequest request)
        {
            try
            {
                if (request == null)
                {
                    return Json(new
                    {
                        Result = 0,
                        Message = "Invalid request."
                    });
                }

                if (string.IsNullOrWhiteSpace(request.Ids))
                {
                    return Json(new
                    {
                        Result = 0,
                        Message = "Select at least one record."
                    });
                }

                request.Target = request.Target?.Trim().ToUpper();

                if (request.Target != "M" && request.Target != "S")
                {
                    return Json(new
                    {
                        Result = 0,
                        Message = "Invalid target. Use M or S."
                    });
                }

                request.CompanyID = await GetCompanyId();
                //request.UserId = await GetUserId();
                //request.UserName = await GetUserName();

                var result = await _client.SetAccessAsync(request);

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Result = 0,
                    Message = "Something went wrong.",
                    TechnicalMessage = ex.Message
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Delete(
    [FromBody] DeleteRequest request)
        {
            try
            {
                

                if (request?.Ids == null || request.Ids.Count == 0)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "Select at least one record."
                    });
                }

                request.CompanyId = await GetCompanyId();

                var response = await _client.DeleteAsync(request);

                return Ok(new
                {
                    success = response.Success,
                    message = response.Message
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
