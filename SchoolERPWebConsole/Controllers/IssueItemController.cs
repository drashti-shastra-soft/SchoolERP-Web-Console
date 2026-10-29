using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;

namespace SchoolERPWebClient.Controllers
{
    public class IssueItemController : BaseController
    {
        private readonly IIssueItemClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IUserClientService _userClient;
        private readonly IRoleClientService _roleService;
        private readonly IHumanResourceClientService _hrClient;
        private readonly IItemCategoryClientService _itemCategoryclient;
        public IssueItemController(IIssueItemClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IUserClientService userClient, 
            IRoleClientService roleService, IHumanResourceClientService hrClient, IItemCategoryClientService itemCategoryclient) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _userClient = userClient;
            _roleService = roleService;
            _hrClient = hrClient;
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

        private async Task<ItemIssuePageViewModel> BuildItemIssuePageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new ItemIssuePageViewModel();
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
                    SessionID = sessionID ?? await GetSessionId()
                };

                var sessionId = await GetSessionId();
                var itemCategory = _client.GetAllItemIssueWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new ItemIssuePageViewModel
                {
                    ItemIssue = pagedResult.Success ? pagedResult.Data.Data : new List<ItemIssueModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
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
        int? sessionID)
        {
            var model = new ItemIssuePageViewModel();
            try
            {
                model = await BuildItemIssuePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetItemIssuePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildItemIssuePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_ItemIssueTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ItemIssueTablePartial", new ItemIssuePageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new ItemIssueAddViewModel();
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
                        model.EditItemIssue = response.Data;
                    }
                }
                else
                {
                    model.EditItemIssue = null;
                }
                var rolelist = await _userClient.GetRolesDropdownAsync();
                model.RoleList = rolelist.Data;

                var staff = await _hrClient.GetAllStaffAsync(await GetCompanyId(), await GetSessionId(), null);
                model.Staff = staff.Data;

                var itemCategory = await _itemCategoryclient.GetItemCategorDropdownListAsync(await GetCompanyId(), await GetSessionId());
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
        public async Task<IActionResult> Save([FromBody] ItemIssueRequest req)
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
                var r = await _client.UpsertItemIssueAsync(req);
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> UsersByRole(int roleId, string term)
        {
            try
            {

                var sections = await _roleService.GetAllRolesBySearchAsync(roleId, null, await GetCompanyId(), await GetSessionId());
                return Json(sections.Data);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        public async Task<IActionResult> ConfirmReturn(int? id)
        {
            var model = new ItemIssueAddViewModel();
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
                        model.EditItemIssue = response.Data;
                    }
                }
                else
                {
                    model.EditItemIssue = null;
                }
                var rolelist = await _userClient.GetRolesDropdownAsync();
                model.RoleList = rolelist.Data;

                var staff = await _hrClient.GetAllStaffAsync(await GetCompanyId(), await GetSessionId(), null);
                model.Staff = staff.Data;

                var itemCategory = await _itemCategoryclient.GetItemCategorDropdownListAsync(await GetCompanyId(), await GetSessionId());
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
        public async Task<IActionResult> Return([FromBody] ItemIssueReturnModel req)
        {
            try
            {
                bool isCreate = req.ItemIssueId <= 0;
                var r = await _client.IssueReturnAsync(req);
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
