using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;

namespace SchoolERPWebClient.Controllers
{
    public class SMSTypeFieldController : BaseController
    {
        private readonly ISMSTypeFieldClientService _client;
        private readonly ISMSTypeClientService _clientSMSType;
        public SMSTypeFieldController(ISMSTypeFieldClientService client,
            PermissionHelper permHelper,
            ISMSTypeClientService clientSMSType) : base(permHelper)
        {
            _client = client;
            _clientSMSType = clientSMSType;
        }

        private async Task<SMSTypeFieldPageViewModel> BuildSMSTypeFieldPageViewModel(
         int? pageIndex, int? pageSize, string? search)
        {
            var model = new SMSTypeFieldPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/PaymentType/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };

                var itemVoucher = _client.GetAllSMSTypeFieldWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new SMSTypeFieldPageViewModel
                {
                    SMSTypeField = pagedResult.Success ? pagedResult.Data.Data : new List<SMSTypeFieldModel>(),

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

        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search)
        {
            var model = new SMSTypeFieldPageViewModel();
            try
            {
                model = await BuildSMSTypeFieldPageViewModel(pageIndex, pageSize, search);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }
        // ✅ NEW — AJAX endpoint, returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetSMSTypeFieldPartial(int? pageIndex,
        int? pageSize,
        string? search)
        {
            try
            {
                var model = await BuildSMSTypeFieldPageViewModel(pageIndex, pageSize, search);

                return PartialView("_SMSTypeFieldTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SMSTypeFieldTablePartial", new SMSTypeFieldPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new SMSTypeFieldAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/VoucherType/Add"
               );
                var smsType = await _clientSMSType.GetSMSTypeDropdownListAsync();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditSMSTypeField = response.Data;
                    }
                }
                else
                {
                    model.EditSMSTypeField = null;
                }

                model.SMSType = smsType.Data;
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
        public async Task<IActionResult> Save([FromBody] SMSFieldRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.FieldLabel))
                return Json(new { success = false, message = "Field label is required." });

            if (string.IsNullOrWhiteSpace(req.FieldKey) || !System.Text.RegularExpressions.Regex.IsMatch(req.FieldKey, "^[A-Za-z0-9_]+$"))
                return Json(new { success = false, message = "Field key is required and can only contain letters, numbers, and underscores." });

            if (req.SMSTypeId <= 0)
                return Json(new { success = false, message = "Please select a payment type." });

            try
            {
                var r = await _client.UpsertSMSTypeAsync(req);

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
