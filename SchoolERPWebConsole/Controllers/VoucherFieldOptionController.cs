using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class VoucherFieldOptionController : BaseController
    {
        private readonly IVoucherFieldOptionClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly IVoucherTypeFieldClientService _clientVoucherTypeField;
        private readonly ISessionClientService _sessionService;
        public VoucherFieldOptionController(
            IVoucherFieldOptionClientService client,
            PermissionHelper permHelper,
            IVoucherTypeFieldClientService clientVoucherTypeField,
            ICompanyClientService companyService,
            ISessionClientService sessionService) : base(permHelper)
        {
            _client = client;
            _clientVoucherTypeField = clientVoucherTypeField;
            _companyService = companyService;
            _sessionService = sessionService;
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
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private async Task<VoucherFieldOptionPageViewModel> BuildVoucherFieldOptionPageViewModel(
        int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new VoucherFieldOptionPageViewModel();
            try
            {
                var perms = await GetPermissions("/VoucherTypeField/Index");

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                };

                var itemVoucher = _client.GetAllVoucherFieldOptionWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new VoucherFieldOptionPageViewModel
                {
                    VoucherFieldOption = pagedResult.Success ? pagedResult.Data.Data : new List<VoucherFieldOptionModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search
                };

                model.Permissions = perms;
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new VoucherFieldOptionPageViewModel();
            try
            {
                model = await BuildVoucherFieldOptionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetVoucherFieldOptionPartial(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildVoucherFieldOptionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
                return PartialView("_VoucherFieldOptionTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VoucherFieldOptionTablePartial", new VoucherFieldOptionPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new VoucherFieldOptionAddViewModel();
            try
            {
                // this controller's own Add page, not the parent VoucherType module.
                var perms = await GetPermissions("/Add");

                // the dropdown here must list voucher types
                var voucherType = await _clientVoucherTypeField.GetVoucherTypeFieldDropdownListAsync(await GetCompanyId());

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditVoucherFieldOption = response.Data;
                    }
                }
                else
                {
                    model.EditVoucherFieldOption = null;
                }

                model.Field = voucherType.Data;
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

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] VoucherFieldOptionRequest req)
        {
          
            if (req.FieldID <= 0)
                return Json(new { success = false, message = "Please select a voucher type." });
            
            // CompanyID is always stamped server-side — never trust a value
            // the client might send for this.
            req.CompanyID = await GetCompanyId();

            try
            {
                var r = await _client.UpsertVoucherFieldOptionAsync(req);

                if (r?.Data == null)
                    return Json(new { success = false, message = "No response received from the server." });

                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }



    }
}
