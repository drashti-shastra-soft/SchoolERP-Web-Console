using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class InventoryItemController : BaseController
    {
        private readonly IInventoryItemClientService _client;
        private readonly IItemCategoryClientService _itemCategoryclient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        public InventoryItemController(IInventoryItemClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IItemCategoryClientService itemCategoryclient) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _itemCategoryclient = itemCategoryclient;
        }
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

        private async Task<InventoryItemPageViewModel> BuildInventoryItemPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID,int? itemCategoryId)
        {
            var model = new InventoryItemPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/ItemCategory/Index"
               );

                var request = new SearchInventoryItemRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    ItemCategoryId= itemCategoryId
                };

                var sessionId = await GetSessionId();
                var itemCategory = _client.GetAllInventoryItemWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new InventoryItemPageViewModel
                {
                    Item = pagedResult.Success ? pagedResult.Data.Data : new List<InventoryItemModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    ItemCategoryId=request.ItemCategoryId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {

                throw;
            }

        }

        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, int? itemCategoryId)
        {
            var model = new InventoryItemPageViewModel();
            try
            {
                model = await BuildInventoryItemPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, itemCategoryId);

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
        public async Task<IActionResult> GetInventoryItemPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, int? itemCategoryId)
        {
            try
            {
                var model = await BuildInventoryItemPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, itemCategoryId);

                return PartialView("_InventoryItemTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_InventoryItemTablePartial", new InventoryItemPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new InventoryItemAddViewModel();
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
                        model.EditItem = response.Data;
                    }
                }
                else
                {
                    model.EditItem = null;
                }
                var itemCategory = await _itemCategoryclient.GetItemCategorDropdownListAsync(await GetCompanyId(),await GetSessionId());
                model.ItemCategory = itemCategory.Data;
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
        public async Task<IActionResult> Save([FromBody] InventoryItemModelRequest req)
        {
            try
            {
                bool isCreate = req.ItemCategoryId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertInventoryItemAsync(req);
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
