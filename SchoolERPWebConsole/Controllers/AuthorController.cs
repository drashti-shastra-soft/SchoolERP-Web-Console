using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// Controller for managing library authors. Handles listing, searching, adding, editing, deleting, toggling, and copying authors across companies.
    /// </summary>
    public class AuthorController : BaseController
    {
        private readonly IAuthorClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorController"/> class with required services.
        /// </summary>
        public AuthorController(IAuthorClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
        }
        /// <summary>
        /// Retrieves the current company ID for the logged-in user. If not cached, fetches from the company service.
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
        /// Retrieves the current session ID for the logged-in user. If not cached, fetches from the session service.
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
        /// Builds the view model for the library author listing page, including pagination, search, and permissions.
        /// This method prepares all the data required to render the author list, such as the list of authors, companies, and user permissions.
        /// It supports pagination and search functionality, and ensures that the correct company context is used.
        /// </summary>
        public async Task<AuthorPageViewModel> BuildLibraryAuthorPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new AuthorPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Author/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _client.GetAllAuthorWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new AuthorPageViewModel
                {
                    Author = pagedResult.Success ? pagedResult.Data.Data : new List<AuthorModel>(),
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
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return model;
            }
        }

        /// <summary>
        /// Displays the main author listing page. Handles pagination, search, and company context.
        /// Calls <see cref="BuildLibraryAuthorPageViewModel"/> to prepare the data and returns the view.
        /// If an error occurs, it sets an error message in TempData and returns the view with an empty model.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex,int? pageSize,string? search,int? companyId)
        {
            var model = new AuthorPageViewModel();
            try
            {
                model = await BuildLibraryAuthorPageViewModel(pageIndex, pageSize, search, companyId);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// AJAX endpoint that returns only the author table and pagination partial view.
        /// This is used for dynamic updates of the author list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLibraryAuthorPartial(int? pageIndex,int? pageSize,string? search,int? companyId)
        {
            try
            {
                var model = await BuildLibraryAuthorPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_LibraryAuthorTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibraryAuthorTablePartial", new AuthorPageViewModel());
            }
        }

        /// <summary>
        /// Displays the Add/Edit Author page. If an ID is provided, loads the author for editing.
        /// Otherwise, prepares the page for adding a new author.
        /// Also loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Author/Index"
               );
                var model = new AuthorAddViewModel();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Author = response.Data;
                        model.EditAuthor = response.Data;
                    }
                }
                else
                {
                    model.EditAuthor = null;
                }

                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        /// <summary>
        /// Handles the creation or update of an author record.
        /// Accepts an AuthorRequest object, ensures the company context is set, and calls the client service to save the author.
        /// Returns a JSON result indicating success or failure, along with a message.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveAuthor([FromBody] AuthorRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;                
                if(request.CompanyID ==0 || request.CompanyID == null) 
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertAuthorAsync(request);
                return Json(new { success = response.Data.Result, message = response.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more authors by their IDs.
        /// Accepts a list of author IDs and calls the client service to delete them.
        /// Returns a JSON result indicating success or failure, along with a message.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteAuthor([FromBody] List<int> ids)
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
        /// Toggles the active/inactive status of an author.
        /// Accepts a status update request and calls the client service to update the status.
        /// Returns a JSON result indicating success or failure, along with a message.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleAuthor([FromBody] StatusUpdateRequest request)
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
        /// Gets all authors for a given company.
        /// If the company ID is not provided or is zero, it fetches the current company ID.
        /// Returns a JSON result with the list of authors.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(int companyId)
        {
            try
            {
                if (companyId == null || companyId == 0)
                {
                    companyId = await GetCompanyId();
                }
                var response = await _client.GetAllAsync(companyId, false);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates or updates a library author.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> CopyLibraryAuthor([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _client.CopyLibraryAuthorAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
