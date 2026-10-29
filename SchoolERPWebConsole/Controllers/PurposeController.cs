using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class PurposeController : BaseController
    {
        private readonly IFrontOfficeClientService _client;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ISectionClientService _sectionClient;
        private readonly ICompanyClientService _companyService;
        private const string MenuPath = "/FrontOffice/Setup";
        private readonly ISessionClientService _sessionService;
        public PurposeController(
            IFrontOfficeClientService client,
            IUserMenuPermissionClientService menuPerm,
            ISessionClientService sessionService,
            PermissionHelper permHelper,
            ICompanyClientService companyService, ISectionClientService sectionClient) : base(permHelper)
        {
            _client = client;
            _menuPerm = menuPerm;
            _sessionService = sessionService;
            _companyService = companyService;
            _sectionClient = sectionClient;
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
        //public async Task<PurposesPageViewModel> BuildPurposePageViewModel(int? pageIndex,
        //int? pageSize,
        //string? search,
        //int? companyId,
        //int? sessionID)
        //{
        //    var model = new PurposesPageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions(
        //           "/FrontOffice/Setup"
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
        //        var classesResponse = _client.GetAllPurposesWithPageAsync(request);
        //        var sectionsResponse = await _sectionClient.GetAllAsync(false, request.SessionID, request.CompanyID);

        //        var sessionTask = _sessionService.GetAllAsync(false,companyId);
        //        var companiesTask = _companyService.GetAllAsync();

        //        await Task.WhenAll(classesResponse, sessionTask, companiesTask);

        //        var pagedResult = await classesResponse;

        //        model = new PurposesPageViewModel
        //        {
        //            Purposes = pagedResult.Success ? pagedResult.Data.Data : new List<MstFOPurposeViewModel>(),
        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            CompanyId = request.CompanyID,
        //            SessionId = request.SessionID
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

        public async Task<PurposesPageViewModel> BuildPurposePageViewModel(int? pageIndex,int? pageSize,string? search,int? companyId,int? sessionID)
        {
            var model = new PurposesPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/FrontOffice/Setup");

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

                var classesResponse = _client.GetAllPurposesWithPageAsync(request);
                var sectionsResponse = await _sectionClient.GetAllAsync(false, request.SessionID, request.CompanyID);

                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);   // ✅ fixed
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new PurposesPageViewModel
                {
                    Purposes = pagedResult.Success ? pagedResult.Data.Data : new List<MstFOPurposeViewModel>(),
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
            var model = new PurposesPageViewModel();
            try
            {
                model = await BuildPurposePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetPurposePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildPurposePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_PurposeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PurposeTablePartial", new PurposesPageViewModel());
            }
        }

        public async Task<IActionResult> AddPurposes(int? id)
        {
            var model = new PurposesAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PostalReceive"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPurposeByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Purposes = response.Data;
                        model.EditPurposes = response.Data;
                    }
                }
                else
                {
                    model.EditPurposes = null;
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
        public async Task<IActionResult> SavePurpose([FromBody] MstFOPurposeUpsertRequest req)
        {
            try
            {
                bool isCreate = req.PurposeID <= 0;
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
                var r = await _client.UpsertPurposeAsync(req);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> TogglePurposeStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.TogglePurposeStatusAsync(request);
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
        public async Task<IActionResult> DeletePurpose([FromBody] List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.DeletePurposeAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }


        }
        [HttpGet]
        public async Task<IActionResult> GetAllPurposes(int companyId,int sessionId)
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
                var response = await _client.GetAllPurposesAsync(false, companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyPurposes([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _client.CopyPurposeAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
