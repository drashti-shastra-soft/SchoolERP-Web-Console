using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class CategoryGroupController : BaseController
    {
        private readonly ICategoryGroupClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;

        /// <summary>
        /// Initializes a new instance of the <see cref="AccountTypeController"/> class.
        /// </summary>
        public CategoryGroupController(ICategoryGroupClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
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

        /// <summary>
        /// Builds the view model for the Account Type page, including permissions, companies, sessions, and account types.
        /// </summary>
        private async Task<CategoryGroupPageViewModel> BuildCategoryGroupPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new CategoryGroupPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                var sessionId = await GetSessionId();
                var itemCategory = _client.GetAllCategoryGroupWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new CategoryGroupPageViewModel
                {
                    CategoryGroup = pagedResult.Success ? pagedResult.Data.Data : new List<CategoryGroupViewModel>(),
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
        /// <summary>
        /// Displays the main Account Type page with a list of account types and related data.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new CategoryGroupPageViewModel();
            try
            {
                model = await BuildCategoryGroupPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }


        /// <summary>
        /// Returns the partial view for the account type table with pagination (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCategoryGroupPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildCategoryGroupPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_CategoryGroupTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_CategoryGroupTablePartial", new CategoryGroupPageViewModel());
            }
        }

        /// <summary>
        /// Displays the Add/Edit Account Type page. If id is provided, loads the account type for editing.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new CategoryGroupAddViewModel();
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
                        model.EditatCegoryGroup = response.Data;
                    }
                }
                else
                {
                    model.EditatCegoryGroup = null;
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
        /// <summary>
        /// Deletes one or more account types by their IDs.
        /// </summary>
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
        /// <summary>
        /// Toggles the active/inactive status of an account type.
        /// </summary>
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
        /// <summary>
        /// Handles the creation or update of an account type.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] CategoryGroupRequest req)
        {
            try
            {
                bool isCreate = req.CategoryGroupId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertCategoryGroupAsync(req);
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }
        
        /// <summary>
        /// Gets all account types for a given company and session.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(int companyId, int sessionId)
        {
            try
            {
                if (companyId == null || companyId == 0)
                {
                    companyId = await GetCompanyId();
                }
                if (sessionId == null || sessionId == 0)
                {
                    sessionId = await GetSessionId();
                }
                var response = await _client.GetAllAsync(companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        /// <summary>
        /// Copies account types from one company/session to another.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CopyCategoryGroup([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopyCategoryGroupAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
