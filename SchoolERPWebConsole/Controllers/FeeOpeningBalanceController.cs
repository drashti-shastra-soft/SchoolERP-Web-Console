using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class FeeOpeningBalanceController : BaseController
    {
        private readonly IFeeOpeningBalanceClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IFeeHeadClientService _feeHeadService;
        private readonly IClassClientService _classService;
        public FeeOpeningBalanceController(IFeeOpeningBalanceClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IFeeHeadClientService feeHeadService, IClassClientService classService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _feeHeadService = feeHeadService;
            _classService = classService;
        }

        /// <summary>
        /// Gets the current company ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }

        /// <summary>
        /// Gets the current session ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int GetUserId() => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value, out var id) ? id : 0;


        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> GetRows(int studentId)
        {
            try
            {
                var req = new StudentFeeOpeningBalanceGetRequest
                {
                    STUDENTID = studentId,
                    COMPANYID = await GetCompanyId(),
                    SESSIONID = await GetSessionId()
                };
                var res = await _client.GetRowsAsync(req);
                return Json(new { success = res.Success, message = res.Message, data = res.Data });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] StudentFeeOpeningBalanceSaveRequest req)
        {
            try
            {
                if (req == null || req.STUDENTID <= 0)
                    return Json(new { success = false, message = "Please select a student." });

                req.COMPANYID = await GetCompanyId();
                req.SESSIONID = await GetSessionId();
                // req.UserId = ...logged-in user id...

                var res = await _client.SaveAsync(req);
                if (!res.Success || res.Data == null)
                    return Json(new { success = false, message = res.Message });

                // SP returns RESULT = 0 on error (reason in MESSAGE)
                return Json(new { success = res.Data.RESULT > 0, message = res.Data.MESSAGE });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        //[HttpPost]
        //public async Task<IActionResult> Delete([FromBody] OpeningBalanceDeleteRequest req)
        //{
        //    try
        //    {
        //        if (req == null || req.StudentId <= 0)
        //            return Json(new { success = false, message = "Please select a student." });

        //        req.CompanyId = await GetCompanyId();
        //        req.SessionId = await GetSessionId();
        //        // req.UserId = ...logged-in user id...

        //        var res = await _client.DeleteAsync(req);
        //        if (!res.Success || res.Data == null)
        //            return Json(new { success = false, message = res.Message });

        //        return Json(new { success = res.Data.Result > 0, message = res.Data.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = ex.Message });
        //    }
        //}


        public async Task<IActionResult> PositionOfStudent(PositionOfStudentFeeRequest request)
        {
            var model = new PositionOfStudentPageViewModel();
            try
            {
                var perms = await GetPermissions(
                "/Index"
                );

                request.COMPANYID = await GetCompanyId();
                request.SESSIONID = await GetSessionId();

                var sessionId = await GetSessionId();
                var itemCategory = _client.GetPositionOfStudentFeeAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.COMPANYID);
                var companiesTask = _companyService.GetAllAsync();
                var PositionOfStudentTask = _client.GetInstallmentDropdownAsync(request.COMPANYID, request.SESSIONID);
                var feeHeadResponse = await _feeHeadService.GetFeeHeadDropdownListAsync(await GetCompanyId(), await GetSessionId());
                var classResponse = await _classService.GetAllAsync(false,await GetSessionId(), await GetCompanyId());

                await Task.WhenAll(itemCategory, sessionTask, companiesTask, PositionOfStudentTask);

                var pagedResult = await itemCategory;

                model = new PositionOfStudentPageViewModel
                {
                    PositionOfStudent = pagedResult.Success ? pagedResult.Data : new List<PositionOfStudentFeeResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),                    
                    CompanyId = request.COMPANYID,
                    SessionId = request.SESSIONID,
                    FeeInstallment= (await PositionOfStudentTask).Data ?? new(),
                    FeeHead =  feeHeadResponse.Data ?? new(),
                    ClassList = classResponse.Data ?? new(),
                    
                };

                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }

        }
    }
}
