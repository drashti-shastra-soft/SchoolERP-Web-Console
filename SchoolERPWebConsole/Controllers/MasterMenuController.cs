using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the system's navigation menus, allowing you to organize the sidebar and set up menu items.
    /// </summary>
    public class MasterMenuController : BaseController
    {
        private readonly IMenuClientService _menuClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private const string MenuPath = "/MasterMenu";

        public MasterMenuController(IMenuClientService menuClient, IUserMenuPermissionClientService menuPerm, PermissionHelper permHelper) : base(permHelper)
        {
            _menuClient = menuClient;
            _menuPerm = menuPerm;
        }

        /// <summary>
        /// Shows the setup page where you can see all available menus and their sub-menus.
        /// </summary>
        public async Task<MenusPageViewModel> BuildMenusPageViewModel(int? pageIndex,
        int? pageSize,
        string? search)
        {
            var model = new MenusPageViewModel();
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


                var classesResponse = await _menuClient.GetAllMenusWithPagePageAsync(request);


                var pagedResult = classesResponse;
                var menus = pagedResult.Success ? pagedResult.Data.Data : new System.Collections.Generic.List<MenuViewModel>();

                model = new MenusPageViewModel
                {
                    Menus = pagedResult.Success ? pagedResult.Data.Data : new List<MenuViewModel>(),
                    ParentMenus = menus,
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
        string? search)
        {
            var model = new MenusPageViewModel();
            try
            {
                model = await BuildMenusPageViewModel(pageIndex, pageSize, search);

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
        public async Task<IActionResult> GetMenusPartial(int? pageIndex,
        int? pageSize,
        string? search)
        {
            try
            {
                var model = await BuildMenusPageViewModel(pageIndex, pageSize, search);

                return PartialView("_MenusTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_MenusTablePartial", new MenusPageViewModel());
            }
        }


        public async Task<IActionResult> AddMenus(int? id)
        {
            var model = new MenusAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Add"
               );
                var resultmenu = await _menuClient.GetAllMenusAsync();
                var menus = resultmenu.Success ? resultmenu.Data : new System.Collections.Generic.List<MenuViewModel>();

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _menuClient.GetMenuByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditMenus = response.Data;
                    }
                }
                else
                {
                    model.EditMenus = null;
                }
                model.Menus = menus;
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
        /// Gets the details of a specific menu item so you can view its settings or edit them.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMenu(int menuId)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit menus." });

            var response = await _menuClient.GetMenuByIdAsync(menuId);
            if (!response.Success) return Json(new { success = false, message = response.Message });
            return Json(new { success = true, menu = response.Data });
        }

        /// <summary>
        /// Saves a new menu item or updates an existing one based on the information you entered.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MenuUpsertRequest request)
        {
            var isCreate = request.MenuID <= 0;
            if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add menus." });
            if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit menus." });

            if (!ModelState.IsValid)
            {
                var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return Json(new { success = false, message = errors });
            }

            var response = await _menuClient.SaveMenuAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Turns a menu item on or off, determining if it appears in the sidebar.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change menu status." });

                var response = await _menuClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Changes the order in which menu items appear in the sidebar.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpdateOrder([FromBody] List<MenuOrderRequest> orders)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to reorder menus." });

            var response = await _menuClient.UpdateMenuOrderAsync(orders);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Deletes a menu item.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete menus." });

            var response = await _menuClient.DeleteMenuAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }
    }
}
