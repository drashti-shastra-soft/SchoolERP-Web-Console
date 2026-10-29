using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class PublisherController : BaseController
    {
        private readonly IPublisherClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        /// <summary>
        /// Initializes a new instance of the <see cref="PublisherController"/> class.
        /// </summary>
        /// <param name="client">The publisher client service.</param>
        /// <param name="companyService">The company service client.</param>
        /// <param name="sessionService">The session service client.</param>
        /// <param name="permHelper">The permission helper.</param>
        public PublisherController(IPublisherClientService client,
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
        /// Renders the publisher index view with a paginated list of publishers.
        /// </summary>
        /// <param name="pageIndex">The index of the page to retrieve.</param>
        /// <param name="pageSize">The number of records per page.</param>
        /// <param name="search">The search term to filter publishers.</param>
        /// <param name="companyId">Optional company identifier.</param>
        /// <returns>The index view with the page model.</returns>
        public async Task<PublisherPageViewModel> BuildPublisherPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new PublisherPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Publisher/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _client.GetAllPublishertWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new PublisherPageViewModel
                {
                    Publisher = pagedResult.Success ? pagedResult.Data.Data : new List<PublisherModel>(),
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
            var model = new PublisherPageViewModel();
            try
            {
                model = await BuildPublisherPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetLibraryPublisherPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildPublisherPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_PublisherTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PublisherTablePartial", new PublisherPageViewModel());
            }
        }

        /// <summary>
        /// Renders the Add/Edit publisher view.
        /// </summary>
        /// <param name="id">Optional publisher identifier to fetch for editing.</param>
        /// <returns>The view with the add/edit model.</returns>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new PublisherddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Publisher/Index"
               );
               
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Publisher = response.Data;
                        model.EditPublisher = response.Data;
                    }
                }
                else
                {
                    model.EditPublisher = null;
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
        /// Creates or updates a publisher record.
        /// </summary>
        /// <param name="request">The publisher request data.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> SavePublisher([FromBody] PublisherRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;
                if(request.CompanyID==0 || request.CompanyID == null) 
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertPublisherAsync(request);
                return Json(new { success = response.Data.Result, message = response.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more publisher records by ID.
        /// </summary>
        /// <param name="ids">List of publisher identifiers to delete.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> DeletePublisher([FromBody] List<int> ids)
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
        /// Toggles the active status of a publisher record.
        /// </summary>
        /// <param name="request">Status update request details.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> TogglePublisher([FromBody] StatusUpdateRequest request)
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
        /// Creates or updates a library publisher.
        /// </summary>
        /// <param name="request">The library publisher request data.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        [HttpPost]
        public async Task<IActionResult> CopyLibraryPublisher([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _client.CopyLibraryPublisherAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
