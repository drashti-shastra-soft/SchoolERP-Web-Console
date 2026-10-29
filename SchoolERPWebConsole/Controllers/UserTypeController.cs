using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the different categories of users in the system (like 'Employee', 'Teacher', or 'Student').
    /// </summary>
    public class UserTypeController : BaseController
    {
        private readonly IUserTypeClientService _userTypeClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private const string MenuPath = "/UserType";


        public UserTypeController(IUserTypeClientService userTypeClient, IUserMenuPermissionClientService menuPerm,
            PermissionHelper permHelper, ICompanyClientService companyService, ISessionClientService sessionService) : base(permHelper)
        {
            _userTypeClient = userTypeClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _sessionService = sessionService;
        }
        /// <summary>
        /// Retrieves the current company ID for the logged-in user.
        /// </summary>
        /// <returns>The company ID as an integer.</returns>
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
        /// Retrieves the current session ID for the logged-in user.
        /// </summary>
        /// <returns>The session ID as an integer.</returns>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        /// <summary>
        /// Shows the main list of all defined user categories.
        /// </summary>
        //public async Task<IActionResult> Index()
        //{
        //    var response = await _userTypeClient.GetAllAsync();
        //    var model = new MstUserManagementPageViewModel
        //    {
        //        UserTypes = response.Success ? response.Data : new System.Collections.Generic.List<MstUserTypeViewModel>()
        //    };
        //    return View(model);
        //}

        /// <summary>
        /// Shows the main list of all defined user categories.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search)
        {
            var model = new MstUserTypePageViewModel();
            try
            {
                model = await BuildUserTypePageViewModel(pageIndex, pageSize, search);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }

        }

        // Shared logic extracted so both actions use the same code
        private async Task<MstUserTypePageViewModel> BuildUserTypePageViewModel(int? pageIndex, int? pageSize, string? search)
        {
            var perms = await GetPermissions("/UserType");
            var request = new SearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search
            };

            var sectionResponse = _userTypeClient.GetAllUserTypesWithPageAsync(request);
            var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(sectionResponse, sessionTask, companiesTask);
            var pagedResult = await sectionResponse;

            return new MstUserTypePageViewModel
            {
                UserTypes = pagedResult.Success ? pagedResult.Data.Data : new List<MstUserTypeViewModel>(),               
                TotalRecords = pagedResult.Data.TotalRecords,
                //TotalPages = pagedResult.Data.TotalPages,
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                Permissions = perms
            };
        }

        // AJAX partial load — returns just the table markup
        [HttpGet]
        public async Task<IActionResult> GetUserTypePartial(int? pageIndex, int? pageSize, string? search)
        {
            var model = new MstUserTypePageViewModel();
            try
            {
                model = await BuildUserTypePageViewModel(pageIndex, pageSize, search);
                return PartialView("_UserTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }

        }


        // ------------------------------------------------------------
        // ADD / EDIT PAGE   /UserType/Add  or  /UserType/Add/5
        // ------------------------------------------------------------
        public async Task<IActionResult> Add(int? id)
        {
            var model = new MstUserTypeAddViewModel();
            try
            {
                var isEdit = id.HasValue && id.Value > 0;

                if (!(await _menuPerm.Has(MenuPath, isEdit ? "Edit" : "Add")).Data)
                {
                    TempData["Error"] = "You do not have permission for this action.";
                    return RedirectToAction(nameof(Index));
                }

                if (isEdit)
                {
                    var res = await _userTypeClient.GetByIdAsync(id!.Value);
                    if (res.Success) model.EditUserType = res.Data;
                }
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }


        /// <summary>
        /// Gets the details of a specific user category so you can view or edit its name.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUserType(int typeId)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit user types." });

            var response = await _userTypeClient.GetByIdAsync(typeId);
            if (!response.Success) return Json(new { success = false, message = response.Message });
            return Json(new { success = true, userType = response.Data });
        }

        /// <summary>
        /// Saves a new user category or updates an existing one with the name you provided.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstUserTypeUpsertRequest request)
        {
            var isCreate = request.UserTypeID <= 0;
            if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add user types." });
            if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit user types." });

            var response = await _userTypeClient.SaveAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        // ------------------------------------------------------------
        // TOGGLE ACTIVE / INACTIVE  (one row switch OR bulk buttons)
        // Body: { ids: "1,4,7", isActive: true }
        // ------------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change user type status." });

                var response = await _userTypeClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ------------------------------------------------------------
        // DELETE (multiple)  Body: [1,4,7]
        // ------------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "You do not have permission to delete user types." });

                if (ids == null || ids.Count == 0)
                    return Json(new { success = false, message = "Please select at least one user type." });

                var response = await _userTypeClient.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
