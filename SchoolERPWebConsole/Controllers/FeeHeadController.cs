using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class FeeHeadController : BaseController
    {
        private readonly IFeeHeadClientService _client;
        private readonly IAccountHeadClientService _accountHeadClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IFeeCategoryClientService _feeCategoryService;
        /// <summary>
        /// Initializes a new instance of the <see cref="AccountTypeController"/> class.
        /// </summary>
        public FeeHeadController(IFeeHeadClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IAccountHeadClientService accountHeadClient,
            IFeeCategoryClientService feeCategoryService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _accountHeadClient = accountHeadClient;
            _feeCategoryService = feeCategoryService;
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
        private async Task<FeeHeadPageViewModel> BuildFeeHeadPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new FeeHeadPageViewModel();
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
                var itemCategory = _client.GetAllFeeHeadWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new FeeHeadPageViewModel
                {
                    FeeHead = pagedResult.Success ? pagedResult.Data.Data : new List<FeeHeadViewModel>(),
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
            var model = new FeeHeadPageViewModel();
            try
            {
                model = await BuildFeeHeadPageViewModel(
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
        public async Task<IActionResult> GetFeeHeadPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildFeeHeadPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_FeeHeadTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_FeeHeadTablePartial", new FeeHeadPageViewModel());
            }
        }

        /// <summary>
        /// Displays the Add/Edit Account Type page. If id is provided, loads the account type for editing.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new FeeHeadAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var feecategoryResponse = await _feeCategoryService.GetFeeCategoryDropdownListAsync(await GetCompanyId(), await GetSessionId());
                var accountHeadResponse = await _accountHeadClient.GetAccountParentDropdownListAsync(null, await GetCompanyId(), await GetSessionId());

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditFeeHead = response.Data;
                    }
                }
                else
                {
                    model.EditFeeHead = null;
                }
                model.FeeCategory = feecategoryResponse.Data ?? new List<DropdownModel>();
                model.AccountType = accountHeadResponse.Data ?? new List<DropdownModel>();
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
        public async Task<IActionResult> Save([FromBody] FeeHeadRequest req)
        {
            try
            {
                bool isCreate = req.FeeHeadId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertFeeCategoryAsync(req);
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
