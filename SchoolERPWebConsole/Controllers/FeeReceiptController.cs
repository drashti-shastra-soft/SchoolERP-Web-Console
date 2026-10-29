using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class FeeReceiptController : BaseController
    {
        private readonly IStudentInformationClientService _studentService;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IFeeTemplateClientService _feeTemplateService;
        private readonly IVoucherHeaderClientService _voucherHeaderService;
        public FeeReceiptController(IStudentInformationClientService studentService,
            PermissionHelper permHelper,
            ICompanyClientService companyService,
            ISessionClientService sessionService, IFeeTemplateClientService feeTemplateService, IVoucherHeaderClientService voucherHeaderService) : base(permHelper)
        {
            _studentService = studentService;
            _companyService = companyService;
            _sessionService = sessionService;
            _feeTemplateService = feeTemplateService;
            _voucherHeaderService = voucherHeaderService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value ?? "0");
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }


        public async Task<IActionResult> FeeReceipt()
        {
            var model = new FeeReceiptPageViewModel();
            try
            {
                var perms = await GetPermissions(
                  "/Add"
              );

                model.TodayDate = DateTime.Now;
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
        public async Task<IActionResult> SearchMember(string? searchText)
        {
            try
            {
                var res = await _studentService.GetAllFeesSearchStudent(await GetCompanyId(),  searchText);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> SearchVoucher(string? searchText)
        {
            try
            {
                var res = await _studentService.GetAllSearchVoucher(await GetCompanyId(), searchText, 11);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> VoucherGetByID(int id)
        {
            try
            {                
                var res = await _voucherHeaderService.GetByIDAsync(id);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetFeeTemplateDetails(int feeTemplateId)
        {
            try
            {
                var res = await _feeTemplateService.GetFeeTemplateDetailsAsync(feeTemplateId);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStudentInstallmentSummary(int studentid)
        {
            try
            {
                var res = await _feeTemplateService.GetStudentInstallmentSummaryAsync(studentid, await GetCompanyId(), await GetSessionId());
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetPaymentModeSummary()
        {
            try
            {
                var req = new StudentFeeCollectionRequest
                {
                    CompanyId=await GetCompanyId(),
                    SessionId=await GetSessionId(),
                    FromDate=DateTime.Now,
                    ToDate=DateTime.Now,
                    UserId=GetUserId()
                };
                var res = await _feeTemplateService.GetPaymentModeSummaryAsync(req);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
