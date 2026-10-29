using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class LibrarySeriesController : BaseController
    {
        private readonly ILibrarySeriesClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;

        public LibrarySeriesController(ILibrarySeriesClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
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
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        public async Task<LibrarySeriesPageViewModel> BuildLibrarySeriesPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new LibrarySeriesPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryCategory/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _client.GetAllLibrarySeriesWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new LibrarySeriesPageViewModel
                {
                    Series = pagedResult.Success ? pagedResult.Data.Data : new List<LibrarySeriesModel>(),
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


        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new LibrarySeriesPageViewModel();
            try
            {
                model = await BuildLibrarySeriesPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetLibrarySeriesPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildLibrarySeriesPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_LibrarySeriesTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibrarySeriesTablePartial", new LibrarySeriesPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new LibrarySeriesAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryCategory/Index"
               );
                
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Series = response.Data;
                        model.EditSeries = response.Data;
                    }
                }
                else
                {
                    model.EditSeries = null;
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
        public async Task<IActionResult> SaveLibrarySeries([FromBody] LibrarySeriesRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;                
                if(request.CompanyID==0 || request.CompanyID == null) 
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertLibrarySeriesAsync(request);
                return Json(new { success = response.Data.Result, message = response.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> DeleteLibrarySeries([FromBody] List<int> ids)
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
        public async Task<IActionResult> ToggleLibrarySeries([FromBody] StatusUpdateRequest request)
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
                var response = await _client.GetAllAsync(companyId, null);
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
        public async Task<IActionResult> CopyLibrarySeries([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _client.CopyLibrarySeriesAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
