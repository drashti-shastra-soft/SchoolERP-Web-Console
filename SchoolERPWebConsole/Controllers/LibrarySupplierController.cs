using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class LibrarySupplierController : BaseController
    {
        private readonly ILibrarySupplierClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IPostalCodeClienService _postalCodeService;
        private readonly ICityClientService _cityService;
        private readonly IStateClientService _stateService;
        private readonly ICountryClientService _countryService;
        public LibrarySupplierController(ILibrarySupplierClientService client,
            ICompanyClientService companyService,
            ISessionClientService sessionService,
            IPostalCodeClienService postalCodeService,
            ICityClientService cityClientService,
            IStateClientService stateClientService,
            ICountryClientService countryClientService,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _postalCodeService = postalCodeService;
            _cityService = cityClientService;
            _stateService = stateClientService;
            _countryService = countryClientService;
        }
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == default(int))
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
        public async Task<LibrarySupplierPageViewModel> BuildLibrarySupplierPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new LibrarySupplierPageViewModel();
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

                var budgetResponse = _client.GetAllLibrarySupplierWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new LibrarySupplierPageViewModel
                {
                    Supplier = pagedResult.Success ? pagedResult.Data.Data : new List<LibrarySupplierModel>(),
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
            var model = new LibrarySupplierPageViewModel();
            try
            {
                model = await BuildLibrarySupplierPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetLibrarySupplierPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildLibrarySupplierPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_LibrarySupplierTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibrarySupplierTablePartial", new LibrarySupplierPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new LibrarySupplierAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibrarySupplier/Index"
               );
                
                var country = await _countryService.GetAllAsync(await GetCompanyId(), await GetSessionId());
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Supplier = response.Data;
                        model.EditSupplier = response.Data;
                    }
                }
                else
                {
                    model.EditSupplier = null;
                }
                model.Country = country?.Data ?? new();
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
        public async Task<IActionResult> SaveLibrarySupplier([FromBody] LibrarySupplierRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;
                request.CompanyID = await GetCompanyId();
                var response = await _client.UpsertLibrarySupplierAsync(request);
                return Json(new { success = response.Data.Result, message = response.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> DeleteLibrarySupplier([FromBody] List<int> ids)
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
        public async Task<IActionResult> ToggleLibrarySupplier([FromBody] StatusUpdateRequest request)
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
        public async Task<IActionResult> CopyLibrarySupplier([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _client.CopyLibrarySupplierAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
