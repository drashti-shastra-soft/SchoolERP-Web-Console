using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class LibraryBudgetController : BaseController
    {
        private readonly ILibraryBudgetClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        /// <summary>
        /// Initializes a new instance of the <see cref="LibraryBudgetController"/> class.
        /// </summary>
        /// <param name="client">The library budget client service.</param>
        /// <param name="companyService">The company service client.</param>
        /// <param name="sessionService">The session service client.</param>
        /// <param name="permHelper">The permission helper.</param>
        public LibraryBudgetController(ILibraryBudgetClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
        }

        /// <summary>
        /// Gets the current company identifier for the logged-in user.
        /// </summary>
        /// <returns>The company ID.</returns>
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
        /// Gets the current session identifier for the logged-in user.
        /// </summary>
        /// <returns>The session ID.</returns>
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
        /// Renders the library budget index view with a paginated list of budgets.
        /// </summary>
        /// <param name="pageIndex">The index of the page to retrieve.</param>
        /// <param name="pageSize">The number of records per page.</param>
        /// <param name="search">The search term to filter budgets.</param>
        /// <param name="companyId">Optional company identifier.</param>
        /// <returns>The index view with the page model.</returns>
        public async Task<LibraryBudgetPageViewModel> BuildLibraryBudgetPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new LibraryBudgetPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryBudget/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _client.GetAllLibraryBudgetWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new LibraryBudgetPageViewModel
                {
                    LibraryBudget = pagedResult.Success ? pagedResult.Data.Data : new List<LibraryBudgetModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID
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


        /// <summary>
        /// Shows the 'Subject' management page where you can define, search, and filter all subjects taught in the school.
        /// Use this to manage all subjects, including pagination and filtering.
        /// </summary>
        // Full page load
        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new LibraryBudgetPageViewModel();
            try
            {
                model = await BuildLibraryBudgetPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetLibraryBudgetPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildLibraryBudgetPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_LibraryBudgetTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibraryBudgetTablePartial", new LibraryBudgetPageViewModel());
            }
        }

        

        /// <summary>
        /// Renders the Add/Edit library budget view.
        /// </summary>
        /// <param name="id">Optional budget identifier to fetch for editing.</param>
        /// <returns>The view with the add/edit model.</returns>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new LibraryBudgetAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryBudget/Index"
               );
               
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.LibraryBudget = response.Data;
                        model.EditLibraryBudget = response.Data;
                    }
                }
                else
                {
                    model.EditLibraryBudget = null;
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
        /// Creates or updates a library budget.
        /// </summary>
        /// <param name="request">The library budget request data.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> SaveLibraryBudget([FromBody] LibraryBudgetRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;
                if(request.CompanyID==0 || request.CompanyID == null) 
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertLibraryBudgetAsync(request);
                return Json(new { success = response.Data.Result, message = response.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more library budgets by ID.
        /// </summary>
        /// <param name="ids">List of library budget identifiers to delete.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> DeleteLibraryBudge([FromBody] List<int> ids)
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
        /// Toggles the active status of a library budget.
        /// </summary>
        /// <param name="request">Status update request details.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> ToggleLibraryBudge([FromBody] StatusUpdateRequest request)
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


        [HttpGet]
        public async Task<IActionResult> GetAll(int companyId)
        {
            try
            {                
                if(companyId==null || companyId == 0) 
                {
                    companyId = await GetCompanyId();
                }
                var response = await _client.GetAllAsync(companyId,false);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates or updates a library budget.
        /// </summary>
        /// <param name="request">The library budget request data.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> CopyLibraryBudget([FromBody] CopyForCompanyRequest request)
        {
            try
            {               
                var response = await _client.CopyLibraryBudgetAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
