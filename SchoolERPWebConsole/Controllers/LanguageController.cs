using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the languages available in the system, letting you add new ones or change existing ones.
    /// </summary>
    public class LanguageController : BaseController
    {
        private readonly ILanguageClientService _languageClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private const string MenuPath = "/Language";

        public LanguageController(ILanguageClientService languageClient, IUserMenuPermissionClientService menuPerm, PermissionHelper permHelper) : base(permHelper)
        {
            _languageClient = languageClient;
            _menuPerm = menuPerm;
        }

        /// <summary>
        /// Shows the main list of all languages that the system currently supports.
        /// </summary>
        
        

        public async Task<LanguagePageViewModel> BuildLanguagePageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new LanguagePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };


                var classesResponse =await _languageClient.GetAllLanguageWithPageAsync(request);


                var pagedResult = classesResponse;

                model = new LanguagePageViewModel
                {
                    Languages = pagedResult.Success ? pagedResult.Data.Data : new List<MstLanguageViewModel>(),
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
            var model = new LanguagePageViewModel();
            try
            {
                model = await BuildLanguagePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetLanguagePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildLanguagePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_LanguageTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LanguageTablePartial", new LanguagePageViewModel());
            }
        }



        /// <summary>
        /// Gets the details of a specific language so you can see its settings or edit it.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLanguage(int id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit languages." });

            var response = await _languageClient.GetByIDAsync(id);
            if (!response.Success) return Json(new { success = false, message = response.Message });
            return Json(new { success = true, data = response.Data });
        }

        /// <summary>
        /// Saves a new language or updates an existing one with the details you provided.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstLanguageUpsertRequest request)
        {
            // Step 1: Check if the user is allowed to add or edit languages based on whether it already exists.
            var isCreate = request.LanguageId <= 0;
            if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add languages." });
            if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit languages." });
 
            // Step 2: Send the new language details to the backend system to be saved.
            var response = await _languageClient.UpsertAsync(request);
            
            // Step 3: Inform the user if the record was saved successfully.
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Turns a language on or off, determining if it can be used in the system.
        /// </summary>
        //[HttpPost]
        //public async Task<IActionResult> ToggleStatus(int id, bool isActive)
        //{
        //    if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
        //        return Json(new { success = false, message = "You do not have permission to change language status." });

        //    var response = await _languageClient.ToggleStatusAsync(id, isActive);
        //    return Json(new { success = response.Success, message = response.Message });
        //}

        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _languageClient.ToggleStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Permanently removes a language from the system's records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody]  List<int> id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete languages." });

            var response = await _languageClient.DeleteAsync(id);
            return Json(new { success = true, message = response.Message });
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new LanguageAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _languageClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Languages = response.Data;
                        model.EditLanguages = response.Data;
                    }
                }
                else
                {
                    model.EditLanguages = null;
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
