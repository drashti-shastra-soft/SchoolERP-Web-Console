using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class ItemSupplierController : BaseController
    {
        private readonly IItemSupplierClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IPostalCodeClienService _postalCodeService;
        private readonly ICityClientService _cityService;
        private readonly IStateClientService _stateService;
        private readonly ICountryClientService _countryService;
        public ItemSupplierController(IItemSupplierClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
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

        private async Task<ItemSupplierPageViewModel> BuildItemSupplierPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new ItemSupplierPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/ItemCategory/Index"
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
                var itemCategory = _client.GetAllItemSupplierWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                model = new ItemSupplierPageViewModel
                {
                    ItemSupplier = pagedResult.Success ? pagedResult.Data.Data : new List<ItemSupplierModel>(),
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
            var model = new ItemSupplierPageViewModel();
            try
            {
                model = await BuildItemSupplierPageViewModel(
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
        public async Task<IActionResult> GetItemSupplierPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildItemSupplierPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_ItemSupplierTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ItemSupplierTablePartial", new ItemSupplierPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new ItemSupplierAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var country = await _countryService.GetAllAsync(await GetCompanyId(), sessionId);
                var state = await _stateService.GetAllAsync(await GetCompanyId(), sessionId);
                var city = await _cityService.GetAllAsync(await GetCompanyId(), sessionId);
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditItemSupplier = response.Data;
                    }
                }
                else
                {
                    model.EditItemSupplier = null;
                }
                model.Country = country.Data;
                model.State = state.Data;
                //model.City = city.Data.Data;
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
        public async Task<IActionResult> Save([FromBody] ItemSupplierRequest req)
        {
            try
            {
                bool isCreate = req.ItemSupplierId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertItemSupplierAsync(req);
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

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

        [HttpPost]
        public async Task<IActionResult> CopyItemSupplier([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopyItemSupplierAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
