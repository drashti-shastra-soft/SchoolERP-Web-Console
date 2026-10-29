using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    /// <summary>
    /// Controller for managing Budget Heads in the system.
    /// Handles listing, searching, adding, editing, deleting, toggling, copying, and saving budget head records.
    /// Integrates with company, session, and currency services to ensure all budget operations are performed in the correct context.
    /// </summary>
    public class BudgetHeadController : BaseController
    {
        private readonly IBudgetHeadClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly ICurrencyClientService _currencyClientService;
        public BudgetHeadController(IBudgetHeadClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, ICurrencyClientService currencyClientService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _currencyClientService = currencyClientService;
        }
        /// <summary>
        /// Retrieves the current company ID for the logged-in user.
        /// If not cached, fetches from the company service.
        /// Ensures all budget operations are performed in the correct company context.
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
        /// Retrieves the current session ID for the logged-in user.
        /// If not cached, fetches from the session service.
        /// Used to scope budget heads to the correct academic/financial session.
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
        /// Builds the view model for the budget head listing page.
        /// Fetches paged budget heads, companies, sessions, and currency symbol in parallel for performance.
        /// Prepares all data required to render the budget head list, including permissions, search, and pagination.
        /// </summary>
        private async Task<BudgetHeadPageViewModel> BuildBudgetHeadPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new BudgetHeadPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/CostCenter/Index"
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
                var itemCategory = _client.GetAllBudgetHeadWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();
                var getCurrency = await _currencyClientService.GetCurrencyByCompanyIdAsync(await GetCompanyId());
                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new BudgetHeadPageViewModel
                {
                    BudgetHead = pagedResult.Success ? pagedResult.Data.Data : new List<BudgetHeadModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    CurrencySymbol = getCurrency.Data?.CurrencySymbol
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
        /// Displays the main Budget Head listing page.
        /// Handles pagination, search, company, and session filters.
        /// Calls BuildBudgetHeadPageViewModel to prepare the data and returns the view.
        /// If an error occurs, sets an error message in TempData and returns the view with an empty model.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new BudgetHeadPageViewModel();
            try
            {
                model = await BuildBudgetHeadPageViewModel(
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
        /// AJAX endpoint that returns only the budget head table and pagination partial view.
        /// Used for dynamic updates of the budget head list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBudgetHeadPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildBudgetHeadPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_BudgetHeadTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_BudgetHeadTablePartial", new BudgetHeadPageViewModel());
            }
        }

        /// <summary>
        /// Displays the Add/Edit Budget Head page. If an ID is provided, loads the budget head for editing.
        /// Otherwise, prepares the page for adding a new budget head.
        /// Also loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new BudgetHeadAddViewModel();
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
                        model.EditBudgetHead = response.Data;
                    }
                }
                else
                {
                    model.EditBudgetHead = null;
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
        /// Deletes one or more budget heads by their IDs.
        /// Accepts a list of budget head IDs and calls the client service to delete them.
        /// Returns a JSON result indicating success or failure, along with a message.
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
        /// Toggles the active/inactive status of a budget head.
        /// Accepts a status update request and calls the client service to update the status.
        /// Returns a JSON result indicating success or failure, along with a message.
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
        /// Handles the creation or update of a budget head record.
        /// Accepts a BudgetHeadModelRequest object, ensures company and session context, and calls the client service to save.
        /// Returns a JSON result indicating success or failure, along with a message.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] BudgetHeadModelRequest req)
        {
            try
            {
                bool isCreate = req.BudgetHeadId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertBudgetHeadAsync(req);
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Gets all budget heads for a given company and session.
        /// If the company or session ID is not provided or is zero, it fetches the current context.
        /// Returns a JSON result with the list of budget heads.
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
        /// Copies budget heads from one company/session to another.
        /// Accepts a copy request specifying source and destination.
        /// Calls the client service to perform the copy and returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CopyBudgetHead([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopyBudgetHeadAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
