using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the currency settings page, where you can see, add, or change the different types of money used in the system.
    /// </summary>
    public class CurrenciesController : BaseController
    {
        private readonly ICurrencyClientService _currencyClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private const string MenuPath = "/Currencies";

        public CurrenciesController(ICurrencyClientService currencyClient, IUserMenuPermissionClientService menuPerm, PermissionHelper permHelper) : base(permHelper)
        {
            _currencyClient = currencyClient;
            _menuPerm = menuPerm;
        }

        /// <summary>
        /// Shows the main list of all currencies available in the system.
        /// </summary>
        
        public async Task<MstCurrencyPageViewModel> BuildCurrencyPageViewModel(int? pageIndex,
       int? pageSize,
       string? search,
       int? companyId,
       int? sessionID)
        {
            var model = new MstCurrencyPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Currencies/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };


                var classesResponse = await _currencyClient.GetAllCurrencyWithPageAsync(request);


                var pagedResult = classesResponse;

                model = new MstCurrencyPageViewModel
                {
                    Currencies = pagedResult.Success ? pagedResult.Data.Data : new List<MstCurrencyViewModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search
                };
                model.Permissions = perms;
                // Step 3: Open the 'Setup' page for the user.
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
        int? companyId,
        int? sessionID)
        {
            var model = new MstCurrencyPageViewModel();
            try
            {
                model = await BuildCurrencyPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetCurrencyPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildCurrencyPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_CurrencyTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_CurrencyTablePartial", new MstCurrencyPageViewModel());
            }
        }

        /// <summary>
        /// Gets the details of one specific currency so you can view or edit it.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCurrency(int id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit currencies." });

            var response = await _currencyClient.GetByIDAsync(id);
            if (!response.Success) return Json(new { success = false, message = response.Message });
            return Json(new { success = true, data = response.Data });
        }

        /// <summary>
        /// Saves a new currency or updates an existing one with the information you provided.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstCurrencyUpsertRequest request)
        {
            try
            {
                // Step 1: Check if the user is allowed to add or edit currencies based on whether the currency already exists.
                var isCreate = request.CurrencyId <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add currencies." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit currencies." });

                // Step 2: Send the new currency details to the backend system to be saved.
                var response = await _currencyClient.UpsertAsync(request);

                // Step 3: Inform the user if the record was saved successfully.
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Turns a currency on or off, making it active or inactive in the system.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change currency status." });

            var response = await _currencyClient.ToggleStatusAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Permanently removes a currency from the system's records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete currencies." });

            var response = await _currencyClient.DeleteAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new CurrencyAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Currencies/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _currencyClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Currency = response.Data;
                        model.EditCurrency = response.Data;
                    }
                }
                else
                {
                    model.EditCurrency = null;
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

        
    }
}
