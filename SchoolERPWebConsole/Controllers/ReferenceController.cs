using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class ReferenceController : BaseController
    {
        private readonly IFrontOfficeClientService _client;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private const string MenuPath = "/FrontOffice/Setup";
        private readonly ISessionClientService _sessionService;
        public ReferenceController(
            IFrontOfficeClientService client,
            IUserMenuPermissionClientService menuPerm,
            ISessionClientService sessionService,
            PermissionHelper permHelper,
            ICompanyClientService companyService) : base(permHelper)
        {
            _client = client;
            _menuPerm = menuPerm;
            _sessionService = sessionService;
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
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }

        //public async Task<ReferencePageViewModel> BuildReferencePageViewModel(int? pageIndex,int? pageSize,string? search,int? companyId,int? sessionID)
        //{
        //    var model = new ReferencePageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions(
        //           "/Reference/Index"
        //       );

        //        var request = new ClassSearchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            CompanyID = companyId ?? await GetCompanyId(),
        //            SessionID = sessionID ?? await GetSessionId()
        //        };


        //        var sessionId = await GetSessionId();
        //        var classesResponse = _client.GetAllReferenceWithPageAsync(request);

        //        var sessionTask = _sessionService.GetAllAsync(false, companyId);
        //        var companiesTask = _companyService.GetAllAsync();


        //        await Task.WhenAll(classesResponse, sessionTask, companiesTask);

        //        var pagedResult = await classesResponse;

        //        model = new ReferencePageViewModel
        //        {
        //            Reference = pagedResult.Success ? pagedResult.Data.Data : new List<MstFOReferenceViewModel>(),
        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            CompanyId = companyId,
        //            SessionId = sessionId
        //        };
        //        model.Permissions = perms;
        //        // Step 3: Open the 'Setup' page for the user.
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }
        //}


        public async Task<ReferencePageViewModel> BuildReferencePageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new ReferencePageViewModel();
            try
            {
                var perms = await GetPermissions("/Reference/Index");
                var resolvedCompanyId = companyId ?? await GetCompanyId();
                var resolvedSessionId = sessionID ?? await GetSessionId();

                var request = new ClassSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = resolvedCompanyId,
                    SessionID = resolvedSessionId
                };

                // Paged data (for the grid)
                var classesResponse = _client.GetAllReferenceWithPageAsync(request);

                // Full/unpaged reference list
                var allReferencesTask = _client.GetAllReferencesAsync(includeDeleted: false, companyId: resolvedCompanyId, sessionId: resolvedSessionId);   // ✅ fixed

                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);   // ✅ fixed
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, allReferencesTask, sessionTask, companiesTask);

                var pagedResult = await classesResponse;
                var allReferencesResult = await allReferencesTask;

                model = new ReferencePageViewModel
                {
                    Reference = pagedResult.Success ? pagedResult.Data.Data : new List<MstFOReferenceViewModel>(),
                    AllReferences = allReferencesResult.Success ? allReferencesResult.Data : new List<MstFOReferenceViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = resolvedCompanyId,
                    SessionId = resolvedSessionId
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


        public async Task<IActionResult> Index(int? pageIndex,int? pageSize,string? search,int? companyId,int? sessionID)
        {
            var model = new ReferencePageViewModel();
            try
            {
                model = await BuildReferencePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetReferencePartial(int? pageIndex, int? pageSize,string? search,int? companyId,int? sessionID)
        {
            try
            {
                var model = await BuildReferencePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_ReferenceTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ReferenceTablePartial", new ReferencePageViewModel());
            }
        }

        public async Task<IActionResult> AddReference(int? id)
        {
            var model = new ReferenceAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Reference"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetReferenceByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Reference = response.Data;
                        model.EditReference = response.Data;
                    }
                }
                else
                {
                    model.EditReference = null;
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
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit,
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveReference([FromBody] MstFOReferenceUpsertRequest req)
        {
            try
            {
                bool isCreate = req.ReferenceID <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                
                
                if(req.CompanyID==0 || req.CompanyID == null) 
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertReferenceAsync(req);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Bulk delete — accepts List<int> so multiple rows can be removed in one call. Checks Delete permission.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteReference([FromBody] List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.DeleteReferenceAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Flips a record's active/inactive flag (e.g. an Active/Inactive switch in a table row) without a full edit round-trip. Checks Edit permission.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleReferenceStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.ToggleReferenceStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetAllReference(int companyId, int sessionId)
        {
            try
            {
                if (companyId == null || companyId == default(int))
                {
                    companyId = await GetCompanyId();
                }
                if (sessionId == null || sessionId == default(int))
                {
                    sessionId = await GetSessionId();
                }
                var response = await _client.GetAllReferencesAsync(false, companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyReference([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopyReferenceAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
