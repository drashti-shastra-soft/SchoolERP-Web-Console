using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the different types of actions users are allowed to perform (like 'Add', 'Edit', or 'Delete') across the system.
    /// </summary>
    public class PermissionController : BaseController
    {
        private readonly IUserManagementClientService _userMgmtService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private const string MenuPath = "/Permission";

        public PermissionController(IUserManagementClientService userMgmtService, IUserMenuPermissionClientService menuPerm, PermissionHelper permHelper) : base(permHelper)
        {
            _userMgmtService = userMgmtService;
            _menuPerm = menuPerm;
        }

        /// <summary>
        /// Shows the main page with a list of all defined permissions.
        /// </summary>
        public async Task<MstUserManagementPageViewModel> BuildPermissionPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new MstUserManagementPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Permission"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };


                var classesResponse = await _userMgmtService.GetAllPermissionWithPageAsync(request);


                var pagedResult = classesResponse;

                model = new MstUserManagementPageViewModel
                {
                    Permissions = pagedResult.Success ? pagedResult.Data.Data : new List<MstPermissionViewModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search
                };
                model.PermissionsButton = perms;
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
            var model = new MstUserManagementPageViewModel();
            try
            {
                model = await BuildPermissionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetPermissionPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildPermissionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_PermissionTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PermissionTablePartial", new MstUserManagementPageViewModel());
            }
        }

        /// <summary>
        /// Gets the details of a specific permission type so you can view or edit it.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPermission(int permissionId)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit permissions." });

            var permission =(await _userMgmtService.GetPermissionByIDAsync(permissionId)).Data;
            if (permission == null) return Json(new { success = false, message = "Permission not found" });
            return Json(new { success = true, permission = permission });
        }

        /// <summary>
        /// Saves a new permission type or updates an existing one with the details you provided.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstPermissionUpsertRequest request)
        {
            var isCreate = request.PermissionID <= 0;
            if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add permissions." });
            if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit permissions." });

            var userId = (await _menuPerm.GetCurrentUserIdAsync()).Data;
            if (userId <= 0)
                return Json(new { success = false, message = "You must be signed in to save." });

            var result =await _userMgmtService.UpsertPermissionAsync(request);
            return Json(new { success = result.Success, message = result.Message });
        }

        /// <summary>
        /// Turns a specific permission type on or off, determining if it can be assigned to roles.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change permission status." });

                var userId = (await _menuPerm.GetCurrentUserIdAsync()).Data;
                if (userId <= 0)
                    return Json(new { success = false, message = "You must be signed in." });

                var result = await _userMgmtService.TogglePermissionStatusAsync(request);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Permanently removes a permission type from the system's records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> permissionId)
        {
            if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete permissions." });

            var userId = (await _menuPerm.GetCurrentUserIdAsync()).Data;
            if (userId <= 0)
                return Json(new { success = false, message = "You must be signed in." });

            var result =await _userMgmtService.DeletePermissionAsync(permissionId);
            return Json(new { success = result.Success, message = result.Message });
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new MstUserManagementAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _userMgmtService.GetPermissionByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditPermissions = response.Data;
                    }
                }
                else
                {
                    model.EditPermissions = null;
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
