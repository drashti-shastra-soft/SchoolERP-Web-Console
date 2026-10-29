using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class VoucherTypeController : BaseController
    {
        private readonly IVoucherTypeClientService _client;
        public VoucherTypeController(IVoucherTypeClientService client,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
        }
        private async Task<VoucherTypePageViewModel> BuildVoucherTypePageViewModel(
         int? pageIndex, int? pageSize, string? search)
        {
            var model = new VoucherTypePageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/VoucherType/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };

                var itemVoucher = _client.GetAllVoucherTypeWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new VoucherTypePageViewModel
                {
                    VoucherType = pagedResult.Success ? pagedResult.Data.Data : new List<VoucherTypeModel>(),
                    
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
            var model = new VoucherTypePageViewModel();
            try
            {
                model = await BuildVoucherTypePageViewModel(pageIndex, pageSize, search);

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
        public async Task<IActionResult> GetVoucherTypePartial(int? pageIndex,
        int? pageSize,
        string? search)
        {
            try
            {
                var model = await BuildVoucherTypePageViewModel(pageIndex, pageSize, search);

                return PartialView("_VoucherTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VoucherTypeTablePartial", new VoucherTypePageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new VoucherTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditVoucherType = response.Data;
                    }
                }
                else
                {
                    model.EditVoucherType = null;
                }
               
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
        public async Task<IActionResult> Save([FromBody] VoucherTypeModelRequest req)
        {
            try
            {
                bool isCreate = req.VoucherId <= 0;
                var r = await _client.UpsertVoucherTypeAsync(req);
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

    }
}
