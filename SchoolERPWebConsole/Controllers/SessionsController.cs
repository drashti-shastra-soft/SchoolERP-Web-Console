using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the academic sessions (like '2023-24' or '2024-25'), allowing you to define the school years used in the system.
    /// </summary>
    public class SessionsController : BaseController
    {
        private readonly ISessionClientService _sessionClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private const string MenuPath = "/Sessions";

        public SessionsController(ISessionClientService sessionClient, ICompanyClientService companyService, IUserMenuPermissionClientService menuPerm, PermissionHelper permHelper) : base(permHelper)
        {
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
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
        /// <summary>
        /// Shows the main list of all academic sessions defined in the system.
        /// </summary>        
        public async Task<MstSessionPageViewModel> BuildSessionPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new MstSessionPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Sessions/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID= companyId ?? await GetCompanyId()
                };


                var classesResponse = await _sessionClient.GetAllSessionWithPageAsync(request);
                var companiesTask = await _companyService.GetAllAsync();

                var pagedResult = classesResponse;

                model = new MstSessionPageViewModel
                {
                    Sessions = pagedResult.Success ? pagedResult.Data.Data : new List<MstSessionViewModel>(),
                    Companies = companiesTask.Success ? companiesTask.Data : new List<MstCompanyViewModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId=request.CompanyID
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
        int? companyId)
        {
            var model = new MstSessionPageViewModel();
            try
            {
                model = await BuildSessionPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetSessionPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildSessionPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_SessionTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SessionTablePartial", new MstSessionPageViewModel());
            }
        }


        /// <summary>
        /// Gets the details of a specific academic session so you can view or edit its dates and name.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSession(int id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit sessions." });

            var response = await _sessionClient.GetByIDAsync(id);
            if (!response.Success) return Json(new { success = false, message = response.Message });
            return Json(new { success = true, data = response.Data });
        }

        /// <summary>
        /// Saves a new academic session or updates an existing one with the dates and name you provided.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstSessionUpsertRequest request)
        {
            try
            {
                var isCreate = request.SessionId <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add sessions." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit sessions." });
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _sessionClient.UpsertAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Turns an academic session on or off, determining if it can be selected for work.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus(int id, bool isActive)
        {
            if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change session status." });

            var response = await _sessionClient.ToggleStatusAsync(id, isActive);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Permanently removes an academic session from the system's records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody]  List<int> id)
        {
            if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete sessions." });

            var response = await _sessionClient.DeleteAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Sets the chosen academic session as the 'active' one for the current user's session.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SetCurrent([FromBody] SetCurrentSessionRequest request)
        {
            if (request == null || request.SessionId <= 0)
                return Json(new { success = false, message = "Invalid session selection." });

            var response = await _sessionClient.SetCurrentSessionAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(bool includeDeleted = false, int? companyId = null)
        {
            var response = await _sessionClient.GetAllAsync(includeDeleted, companyId);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetUserCurrentSession(int? companyId = null)
        {
            var response = await _sessionClient.GetUserCurrentSessionAsync(companyId);
            return Json(new { success = true, data = response.Data });
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new SessionAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Sessions"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _sessionClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Session = response.Data;
                        model.EditSession = response.Data;
                    }
                }
                else
                {
                    model.EditSession = null;
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
        public async Task<IActionResult> CopySession([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _sessionClient.CopySessionAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        // SessionsController.cs
        [HttpGet]
        public async Task<IActionResult> GetByCompany(int? companyId)
        {
            var result = await _sessionClient.GetAllAsync(includeDeleted: false, companyId: companyId);
            if (!result.Success)
                return Json(new { success = false, message = result.Message, data = new List<object>() });

            return Json(new { success = true, data = result.Data }); // [{ sessionId, sessionTitle }, ...]
        }
    }
}
