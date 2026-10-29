using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class VoucherTypeFieldController : BaseController
    {
        private readonly IVoucherTypeFieldClientService _client;
        private readonly ICompanyClientService _companyService;        
        private readonly IVoucherTypeClientService _clientVoucherType;
        private readonly ISessionClientService _sessionService;
        public VoucherTypeFieldController(
            IVoucherTypeFieldClientService client,
            PermissionHelper permHelper,
            IVoucherTypeClientService clientVoucherType,
            ICompanyClientService companyService,
            ISessionClientService sessionService) : base(permHelper)
        {
            _client = client;
            _clientVoucherType = clientVoucherType;
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
        private async Task<VoucherFieldPageViewModel> BuildVoucherTypeFieldPageViewModel(
         int? pageIndex, int? pageSize, string? search,int? companyId,int? sessionID)
        {
            var model = new VoucherFieldPageViewModel();
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

                var itemVoucher = _client.GetAllVoucherTypeFielddWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new VoucherFieldPageViewModel
                {
                    VoucherTypeField = pagedResult.Success ? pagedResult.Data.Data : new List<VoucherTypeFieldModel>(),
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
            var model = new VoucherFieldPageViewModel();
            try
            {
                model = await BuildVoucherTypeFieldPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
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
        public async Task<IActionResult> GetVoucherTypeFieldPartial(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildVoucherTypeFieldPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
                return PartialView("_VoucherTypeFieldTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VoucherTypeFieldTablePartial", new VoucherFieldPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new VoucherTypeFieldAddViewModel();
            try
            {                
                // this controller's own Add page, not the parent VoucherType module.
                var perms = await GetPermissions("/Add");
                
                // the dropdown here must list voucher types
                var voucherType = await _clientVoucherType.GetVoucherTypeDropdownListAsync();

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditVoucherTypeField = response.Data;
                    }
                }
                else
                {
                    model.EditVoucherTypeField = null;
                }

                model.VoucherType = voucherType.Data;
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
        public async Task<IActionResult> Save([FromBody] VoucherFieldRequest req)
        {
            // ------------------------------------------------------------
            // Server-side validation — mirrors SP_VoucherTypeField_Upsert's
            // own checks, so bad requests never reach the database call.
            //
            // FIXED BUG: the original code ran the FIELD CODE regex
            // (^[A-Za-z0-9_]+$) against req.FieldLabel. FieldLabel is a
            // human label like "Cash Book" — it contains a space, so that
            // check would fail on *every* legitimate save. The regex must
            // validate req.FieldCode, not req.FieldLabel.
            // ------------------------------------------------------------
            if (req.VoucherId <= 0)
                return Json(new { success = false, message = "Please select a voucher type." });

            if (string.IsNullOrWhiteSpace(req.FieldLabel))
                return Json(new { success = false, message = "Field label is required." });

            if (string.IsNullOrWhiteSpace(req.FieldCode))
                return Json(new { success = false, message = "Field code is required." });

            if (!System.Text.RegularExpressions.Regex.IsMatch(req.FieldCode, "^[A-Za-z0-9_]+$"))
                return Json(new { success = false, message = "Field code can only contain letters, numbers, and underscores." });

            if (string.IsNullOrWhiteSpace(req.FieldType))
                return Json(new { success = false, message = "Field type is required." });

            if (string.IsNullOrWhiteSpace(req.Section))
                return Json(new { success = false, message = "Section is required." });

            // CompanyID is always stamped server-side — never trust a value
            // the client might send for this.
            req.CompanyID = await GetCompanyId();

            try
            {
                var r = await _client.UpsertVoucherTypeFieldAsync(req);

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