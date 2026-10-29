using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the school's front office activities, such as visitor logs, complaints, phone calls, and mail (postal) services.
    /// </summary>
    public class FrontOfficeController : BaseController
    {
        private readonly IFrontOfficeClientService _client;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classClient;
        private readonly ISectionClientService _sectionClient;
        private readonly IStudentInformationClientService _studentClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly ICompanyClientService _companyService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        private readonly ICountryClientService _countryService;
        private const string MenuPath = "/FrontOffice/Setup";
        private const string ComplaintMenuPath = "/FrontOffice/Complaint";
        private readonly ISessionClientService _sessionService;
        public FrontOfficeController(
            IFrontOfficeClientService client,
            IUserMenuPermissionClientService menuPerm,
            IClassClientService classClient,
            ISectionClientService sectionClient,
            IStudentInformationClientService studentClient,
            IConfiguration configuration,
            IHumanResourceClientService hrClient, ISessionClientService sessionService, PermissionHelper permHelper,
            ICompanyClientService companyService, IPhotoUploadService photoService,
            IWebHostEnvironment environment, ICountryClientService countryService) : base(permHelper)
        {
            _client = client;
            _menuPerm = menuPerm;
            _classClient = classClient;
            _sectionClient = sectionClient;
            _studentClient = studentClient;
            _hrClient = hrClient;
            _sessionService = sessionService;
            _companyService = companyService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
            _countryService = countryService;
        }
        private int GetUserId() => int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value ?? "0");
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
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        /// <summary>
        /// Loads the master-data management page — fetches all Purposes,
        /// Complaint Types, Sources, References in one shot so an admin can manage all four from a single screen.
        /// </summary>
        public async Task<IActionResult> Setup()
        {
            var model = new FrontOfficeSetupPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/Setup"
               );
                // Step 1: Gather all categories like 'Visitor Purposes', 'Complaint Types', 'Sources', and 'References'.
                var purposes = await _client.GetAllPurposesAsync();
                var complaintTypes = await _client.GetAllComplaintTypesAsync();
                var sources = await _client.GetAllSourcesAsync();
                var references = await _client.GetAllReferencesAsync();

                // Step 2: Organize these lists so they can be shown on the setup management page.
                model = new FrontOfficeSetupPageViewModel
                {
                    Purposes = purposes.Success ? purposes.Data : new List<MstFOPurposeViewModel>(),
                    ComplaintTypes = complaintTypes.Success ? complaintTypes.Data : new List<MstFOComplaintTypeViewModel>(),
                    Sources = sources.Success ? sources.Data : new List<MstFOSourceViewModel>(),
                    References = references.Success ? references.Data : new List<MstFOReferenceViewModel>()
                };
                model.Permissions = perms;
                // Step 3: Open the 'Setup' page for the user.
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }

        }

        /// <summary>
        ///  GetReference(id)Fetches one record by ID to pre-fill the "Edit" modal. Each checks Edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPurpose(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.GetPurposeByIDAsync(id);
                if (!r.Success) return Json(new { success = false, message = r.Message });
                return Json(new { success = true, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = true, message = ex.Message });
            }

        }

        /// <summary>
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit, 
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
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
                var r = await _client.UpsertPurposeAsync(req);
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

        /// <summary>
        /// Flips a record's active/inactive flag (e.g. an Active/Inactive switch in a table row) without a full edit round-trip. Checks Edit permission.
        /// </summary>
        //[HttpPost]
        //public async Task<IActionResult> TogglePurposeStatus(int id, bool isActive)
        //{
        //    try
        //    {
        //        if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
        //            return Json(new { success = false, message = "Permission denied." });
        //        var r = await _client.TogglePurposeStatusAsync(id, isActive);
        //        return Json(new { success = r.Success, message = r.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return Json(new { success = false, message = ex.Message });
        //    }

        //}

        /// <summary>
        ///  GetReference(id)Fetches one record by ID to pre-fill the "Edit" modal. Each checks Edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetComplaintType(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.GetComplaintTypeByIDAsync(id);
                if (!r.Success) return Json(new { success = false, message = r.Message });
                return Json(new { success = true, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit, 
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveComplaintType([FromBody] MstFOComplaintTypeUpsertRequest req)
        {
            try
            {
                bool isCreate = req.ComplaintTypeID <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });

                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertComplaintTypeAsync(req);
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
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> DeleteComplaintType([FromBody] List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.DeleteComplaintTypeAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// ToggleComplaintTypeStatus / ToggleSourceStatus / ToggleReferenceStatus(id, isActive)Flips a record's active/inactive flag (e.g. an Active/Inactive switch in a table row) without a full edit round-trip. Checks Edit permission.
        /// </summary>
        //[HttpPost]
        //public async Task<IActionResult> ToggleComplaintTypeStatus(int id, bool isActive)
        //{
        //    try
        //    {
        //        if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
        //            return Json(new { success = false, message = "Permission denied." });
        //        var r = await _client.ToggleComplaintTypeStatusAsync(id, isActive);
        //        return Json(new { success = r.Success, message = r.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return Json(new { success = false, message = ex.Message });
        //    }

        //}

        // ─── SOURCE ─────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetSource(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.GetSourceByIDAsync(id);
                if (!r.Success) return Json(new { success = false, message = r.Message });
                return Json(new { success = true, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit, 
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveSource([FromBody] MstFOSourceUpsertRequest req)
        {
            try
            {
                bool isCreate = req.SourceID <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.UpsertSourceAsync(req);
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
        public async Task<IActionResult> DeleteSource([FromBody] List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.DeleteSourceAsync(id);
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
        //[HttpPost]
        //public async Task<IActionResult> ToggleSourceStatus(int id, bool isActive)
        //{
        //    try
        //    {
        //        if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
        //            return Json(new { success = false, message = "Permission denied." });
        //        var r = await _client.ToggleSourceStatusAsync(id, isActive);
        //        return Json(new { success = r.Success, message = r.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return Json(new { success = false, message = ex.Message });
        //    }

        //}

        // ─── REFERENCE ──────────────────────────────────────────
        /// <summary>
        /// Fetches one record by ID to pre-fill the "Edit" modal. Each checks Edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetReference(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.GetReferenceByIDAsync(id);
                if (!r.Success) return Json(new { success = false, message = r.Message });
                return Json(new { success = true, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
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
                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
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
        //[HttpPost]
        //public async Task<IActionResult> ToggleReferenceStatus(int id, bool isActive)
        //{
        //    try
        //    {
        //        if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
        //            return Json(new { success = false, message = "Permission denied." });
        //        var r = await _client.ToggleReferenceStatusAsync(id, isActive);
        //        return Json(new { success = r.Success, message = r.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return Json(new { success = false, message = ex.Message });
        //    }

        //}

        /// <summary>
        /// Shows the main 'Complaint' management page where you can see all student or parent complaints and their status.
        /// </summary>
        /// 
        public async Task<FOComplaintPageViewModel> BuildComplaintPageViewModel(int? pageIndex,
    int? pageSize,
    string? search,
    int? companyId,
    int? sessionID,
    int? complaintTypeID,
    int? sourceID)
        {
            var model = new FOComplaintPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/FrontOffice/Complaint");
                var resolvedCompanyId = companyId ?? await GetCompanyId();
                var resolvedSessionId = sessionID ?? await GetSessionId();

                var request = new ComplaintSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = resolvedCompanyId,
                    SessionID = resolvedSessionId,
                    ComplaintTypeID = complaintTypeID ?? null,
                    SourceID = sourceID ?? null
                };

                // Step 1: Fetch paged complaints, types of complaints, and where they came from (sources).
                var complaints = _client.GetAllComplaintsWithPageAsync(request);

                var complaintTypes = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "COMPLAINTTYPE");
                var sources = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "SOURCE");

                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);   // ✅ fixed
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(complaints, sessionTask, companiesTask);

                var pagedResult = await complaints;

                // Step 2: Combine this information to be shown on the complaint management screen.
                model = new FOComplaintPageViewModel
                {
                    Complaints = pagedResult.Success ? pagedResult.Data.Data : new List<FOComplaintViewModel>(),
                    ComplaintTypes = complaintTypes.Success ? complaintTypes.Data : new List<DropdownModel>(),
                    Sources = sources.Success ? sources.Data : new List<DropdownModel>(),

                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = resolvedCompanyId,
                    SessionId = resolvedSessionId,
                    ComplaintTypeID = request.ComplaintTypeID,
                    SourceID = request.SourceID
                };
                model.Permissions = perms;
                // Step 3: Open the 'Complaint' management page.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }
        //public async Task<FOComplaintPageViewModel> BuildComplaintPageViewModel(int? pageIndex,
        //int? pageSize,
        //string? search,
        //int? companyId,
        //int? sessionID,
        //int? complaintTypeID,
        //int? sourceID)
        //{
        //    var model = new FOComplaintPageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions(
        //           "/FrontOffice/Complaint"
        //       );
        //        var resolvedCompanyId = companyId ?? await GetCompanyId();
        //        var resolvedSessionId = sessionID ?? await GetSessionId();

        //        var request = new ComplaintSearchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            //CompanyID = companyId ?? await GetCompanyId(),
        //            //SessionID = sessionID ?? await GetSessionId(),
        //            CompanyID = resolvedCompanyId,
        //            SessionID = resolvedSessionId,
        //            ComplaintTypeID = complaintTypeID ?? null,
        //            SourceID=sourceID??null
        //        };

        //        // Step 1: Fetch all recorded complaints, types of complaints, and where they came from (sources).
        //        //var complaints = await _client.GetAllComplaintsAsync();
        //        var complaints = _client.GetAllComplaintsWithPageAsync(request);

        //        var complaintTypes = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "COMPLAINTTYPE");
        //        var sources = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "SOURCE");


        //        var sessionTask = _sessionService.GetAllAsync(false,companyId);
        //        var companiesTask = _companyService.GetAllAsync();




        //        await Task.WhenAll(complaints, sessionTask, companiesTask);

        //        var pagedResult = await complaints;


        //        // Step 2: Combine this information to be shown on the complaint management screen.
        //        model = new FOComplaintPageViewModel
        //        {
        //            Complaints = pagedResult.Success ? pagedResult.Data.Data : new List<FOComplaintViewModel>(),
        //            ComplaintTypes = complaintTypes.Success ? complaintTypes.Data : new List<DropdownModel>(),
        //            Sources = sources.Success ? sources.Data : new List<DropdownModel>(),

        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            //CompanyId = request.CompanyID,
        //            CompanyId = resolvedCompanyId,
        //            SessionId = resolvedSessionId,
        //            ComplaintTypeID = request.ComplaintTypeID,
        //            SourceID=request.SourceID
        //        };
        //        model.Permissions = perms;
        //        // Step 3: Open the 'Complaint' management page.
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }

        //}

        public async Task<IActionResult> Complaint(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        int? complaintTypeID,
        int? sourceID)
        {
            var model = new FOComplaintPageViewModel();
            try
            {
                model = await BuildComplaintPageViewModel(pageIndex, pageSize, search, companyId, sessionID, complaintTypeID, sourceID);

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
        public async Task<IActionResult> GetComplaintPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        int? complaintTypeID,
        int? sourceID)
        {
            try
            {
                var model = await BuildComplaintPageViewModel(pageIndex, pageSize, search, companyId, sessionID, complaintTypeID, sourceID);

                return PartialView("_ComplaintTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ComplaintTablePartial", new FOComplaintPageViewModel());
            }
        }



        public async Task<IActionResult> AddComplaint(int? id)
        {
            var model = new FOComplaintAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PostalReceive"
               );
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var complaintTypes = await _client.GetSetUpFOMasterDropdowmListAsync(companyId, sessionId, "COMPLAINTTYPE");
                var sources = await _client.GetSetUpFOMasterDropdowmListAsync(companyId, sessionId, "SOURCE");
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetComplaintByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Complaints = response.Data;
                        model.EditComplaints = response.Data;
                    }
                }
                else
                {
                    model.EditComplaints = null;
                }
                model.ComplaintTypes = complaintTypes.Data;
                model.Sources = sources.Data;
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
        /// Fetches one record by ID to pre-fill the "Edit" modal. Each checks Edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetComplaint(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(ComplaintMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.GetComplaintByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit, 
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
        /// 
        
        [HttpPost]
        public async Task<IActionResult> SaveComplaint([FromForm] FOComplaintUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (req.ComplaintID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }

                bool isCreate = req.ComplaintID <= 0;
                if (isCreate && !(await _menuPerm.Has(ComplaintMenuPath, "Add")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                if (!isCreate && !(await _menuPerm.Has(ComplaintMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });

                // ── NEW: capture removal intent sent from the client ──────────────
                bool removeAttachment = req.RemoveAttachment;

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;
                }

                var r = await _client.UpsertComplaintAsync(req);

                if (r.Data?.Result?.Result == 1)
                {
                    int? complaintID = r.Data.Result.ComplaintID;

                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        // ── New file uploaded: save it (unchanged from your original) ──
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.FileName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.FileName ?? "photo.jpg",
                                PhotoModule.Complaint,
                                FolderNameModule.Documents,
                                complaintID.Value
                            );

                            var attchment = new FOComplaintAttachmentUpsertRequest
                            {
                                ComplaintID = complaintID.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType
                            };
                            var attachment = await _client.UpsertComplaintAttachmentFileAsync(attchment);
                        }
                    }
                    else if (removeAttachment && complaintID.HasValue)
                    {
                        // ── NEW: no new file uploaded, but user explicitly removed the old one ──
                        var clearReq = new FOComplaintAttachmentUpsertRequest
                        {
                            ComplaintID = complaintID.Value,
                            Attachment = null,
                            FileName = null,
                            FileType = null
                        };
                        await _client.UpsertComplaintAttachmentFileAsync(clearReq);

                        // Optional: if you also need to delete the physical file from disk/blob storage,
                        // fetch the OLD attachment path before UpsertComplaintAsync overwrites it,
                        // then delete it here via your photo/file service, e.g.:
                        // await _photoService.DeletePhotoAsync(oldAttachmentPath);
                    }
                }

                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }
        //[HttpPost]
        //public async Task<IActionResult> SaveComplaint([FromForm] FOComplaintUpsertRequest req, IFormFile? attachmentFile)
        //{
        //    try
        //    {

        //        if (req.ComplaintID == 0 || req.CompanyID == null)
        //        {
        //            req.CompanyID = await GetCompanyId();
        //        }
        //        if (req.SessionID == 0 || req.SessionID == null)
        //        {
        //            req.SessionID = await GetSessionId();
        //        }
        //        bool isCreate = req.ComplaintID <= 0;
        //        if (isCreate && !(await _menuPerm.Has(ComplaintMenuPath, "Add")).Data)
        //            return Json(new { success = false, message = "Permission denied." });
        //        if (!isCreate && !(await _menuPerm.Has(ComplaintMenuPath, "Edit")).Data)
        //            return Json(new { success = false, message = "Permission denied." });

        //        if (attachmentFile != null && attachmentFile.Length > 0)
        //        {
        //            long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
        //            long maxBytes = MaxFileSizeMB * 1024L * 1024L;

        //            if (attachmentFile.Length > maxBytes)
        //            {
        //                return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
        //            }

        //            req.FileName = attachmentFile.FileName;
        //            req.FileType = attachmentFile.ContentType;

        //        }
        //        var r = await _client.UpsertComplaintAsync(req);
        //        if (r.Data?.Result?.Result == 1)
        //        {
        //            int? complaintID = r.Data.Result.ComplaintID;
        //            if (attachmentFile != null && attachmentFile.Length > 0)
        //            {
        //                using var memoryStream = new MemoryStream();
        //                await attachmentFile.CopyToAsync(memoryStream);

        //                byte[] fileBytes = memoryStream.ToArray();
        //                PhotoUploadResult photoResult = new PhotoUploadResult();
        //                if (req.FileName != null)
        //                {
        //                    photoResult = await _photoService.SaveBase64PhotoAsync(
        //                        Convert.ToBase64String(fileBytes),
        //                        req.FileName ?? "photo.jpg",
        //                        PhotoModule.Complaint,
        //                        FolderNameModule.Documents,
        //                        complaintID.Value
        //                    );
        //                    var attchment = new FOComplaintAttachmentUpsertRequest
        //                    {
        //                        ComplaintID = complaintID.Value,
        //                        Attachment = photoResult.PhotoUrl,
        //                        FileName = attachmentFile.FileName,
        //                        FileType = attachmentFile.ContentType

        //                    };
        //                    var attachment = await _client.UpsertComplaintAttachmentFileAsync(attchment);
        //                }
        //            }
        //        }
        //        return Json(new { success = r.Success, message = r.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return Json(new { success = false, message = ex.Message });
        //    }

        //}
        /// <summary>
        /// Bulk delete — accepts List<int> so multiple rows can be removed in one call. Checks Delete permission.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteComplaint([FromBody] List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(ComplaintMenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.DeleteComplaintAsync(id);
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
        public async Task<IActionResult> ToggleComplaintStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(ComplaintMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "Permission denied." });
                var r = await _client.ToggleComplaintStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Shows the 'Postal Receive' page, which tracks all the physical mail or packages the school has received.
        /// </summary>
        /// 

        public async Task<FOPostalReceivePageViewModel> BuildPostalReceivePageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new FOPostalReceivePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/FrontOffice/PostalReceive");
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

                var postalReceiveResponse = _client.GetAllPostalReceiveWithPageAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);   // ✅ fixed
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(postalReceiveResponse, sessionTask, companiesTask);

                var pagedResult = await postalReceiveResponse;

                model = new FOPostalReceivePageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPostalReceiveViewModel>(),
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
        //public async Task<FOPostalReceivePageViewModel> BuildPostalReceivePageViewModel(int? pageIndex,
        //int? pageSize,
        //string? search,
        //int? companyId,
        //int? sessionID)
        //{
        //    var model = new FOPostalReceivePageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions("/FrontOffice/PostalReceive");
        //        var resolvedCompanyId = companyId ?? await GetCompanyId();
        //        var resolvedSessionId = sessionID ?? await GetSessionId();
        //        var request = new ClassSearchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            //CompanyID = companyId ?? await GetCompanyId(),
        //            //SessionID = sessionID ?? await GetSessionId()
        //            CompanyID = resolvedCompanyId,
        //            SessionID = resolvedSessionId
        //        };

        //        var postalReceiveResponse = _client.GetAllPostalReceiveWithPageAsync(request);

        //        var sessionTask = _sessionService.GetAllAsync(false, companyId);
        //        var companiesTask = _companyService.GetAllAsync();

        //        await Task.WhenAll(postalReceiveResponse, sessionTask, companiesTask);

        //        var pagedResult = await postalReceiveResponse;
        //        var res = await _client.GetAllPostalReceivesAsync();
        //        model = new FOPostalReceivePageViewModel
        //        {
        //            Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPostalReceiveViewModel>(),
        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            //CompanyId = request.CompanyID,
        //            CompanyId = resolvedCompanyId,
        //            SessionId = resolvedSessionId

        //        };
        //        model.Permissions = perms;
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }

        //}


        public async Task<IActionResult> PostalReceive(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new FOPostalReceivePageViewModel();
            try
            {
                model = await BuildPostalReceivePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetPostalReceivePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildPostalReceivePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_PostalReceiveTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PostalReceiveTablePartial", new FOPostalReceivePageViewModel());
            }
        }


        public async Task<IActionResult> AddPostalReceive(int? id)
        {
            var model = new FOPostalReceiveAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PostalReceive"
               );
                var country = await _countryService.GetAllAsync(await GetCompanyId(), await GetSessionId());

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPostalReceiveByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
                }
                model.Country = country.Data;
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
        /// Fetches one record by ID to pre-fill the "Edit" modal. Each checks Edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPostalReceive(int id)
        {
            try
            {
                var r = await _client.GetPostalReceiveByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// One upsert endpoint per entity. PurposeID <= 0 (etc.) decides Create vs Edit, 
        /// and checks the matching Add or Edit permission accordingly before calling the service layer.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SavePostalReceive([FromForm] FOPostalReceiveUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;

                }

                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertPostalReceiveAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? postalReceiveID = r.Data.Result.PostalReceiveID;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.FileName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.FileName ?? "photo.jpg",
                                PhotoModule.PostalReceive,
                                FolderNameModule.Documents,
                                postalReceiveID.Value
                            );
                            var attchment = new FOPostalReceiveAttachmentUpsertRequest
                            {
                                PostalReceiveID = postalReceiveID.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType

                            };
                            var attachment = await _client.UpsertPostalReceiveAttachmentFileAsync(attchment);
                        }
                    }
                }

                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Bulk delete — accepts List<int> so multiple rows can be removed in one call. Checks Delete permission.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeletePostalReceive([FromBody] List<int> id)
        {
            try
            {
                var r = await _client.DeletePostalReceiveAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }
        /// <summary>
        /// Flips a record's active/inactive flag (e.g. an Active/Inactive switch in a table row) without a full edit round-trip. Checks Edit permission.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> TogglePostalReceiveStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _client.TogglePostalReceiveStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Streams the stored byte array back as a downloadable file (File(bytes, contentType, fileName)), 
        /// reconstructing the original filename/content-type saved at upload time. Returns 404 if there's no attachment.
        /// </summary>
        [SkipPermissionCheck]
        [HttpGet]
        public async Task<IActionResult> DownloadAttachment(int id)
        {
            try
            {
                var r = await _client.GetPostalReceiveByIDAsync(id);
                if (!r.Success || r.Data?.Attachment == null) return NotFound();

                string contentType = r.Data.FileType ?? "application/octet-stream";
                string fileName = r.Data.FileName ?? $"attachment_{id}";

                return File(r.Data.Attachment, contentType, fileName);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Shows the 'Postal Dispatch' page, which keeps a record of all the mail or packages the school has sent out.
        /// </summary>
        /// 

        public async Task<FOPostalDispatchPageViewModel> BuildPostalDispatchViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new FOPostalDispatchPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/FrontOffice/PostalDispatch");
                var resolvedCompanyId = companyId ?? await GetCompanyId();
                var resolvedSessionId = sessionID ?? await GetSessionId();

                var request = new FOPostalDispatchSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = resolvedCompanyId,
                    SessionID = resolvedSessionId
                };

                var res = _client.GetAllPostalDispatchesWithPageIndexAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);   // ✅ fixed
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(res, sessionTask, companiesTask);

                var pagedResult = await res;

                model = new FOPostalDispatchPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPostalDispatchViewModel>(),
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
        //public async Task<FOPostalDispatchPageViewModel> BuildPostalDispatchViewModel(int? pageIndex,
        //int? pageSize,
        //string? search,
        //int? companyId,
        //int? sessionID)
        //{
        //    var model = new FOPostalDispatchPageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions("/FrontOffice/PostalDispatch");
        //        var resolvedCompanyId = companyId ?? await GetCompanyId();
        //        var resolvedSessionId = sessionID ?? await GetSessionId();

        //        var request = new FOPostalDispatchSearchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            //CompanyID = companyId ?? await GetCompanyId(),
        //            //SessionID = sessionID ?? await GetSessionId()
        //            CompanyID = resolvedCompanyId,
        //            SessionID = resolvedSessionId
        //        };

        //        var res = _client.GetAllPostalDispatchesWithPageIndexAsync(request);
        //        var sessionTask = _sessionService.GetAllAsync(false, companyId);
        //        var companiesTask = _companyService.GetAllAsync();
        //        await Task.WhenAll(res, sessionTask, companiesTask);

        //        var pagedResult = await res;


        //        model = new FOPostalDispatchPageViewModel
        //        {
        //            Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPostalDispatchViewModel>(),
        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            CompanyId = resolvedCompanyId,
        //            SessionId = resolvedSessionId
        //        };
        //        model.Permissions = perms;
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }

        //}

        public async Task<IActionResult> PostalDispatch(int? pageIndex,
      int? pageSize,
      string? search,
      int? companyId,
      int? sessionID)
        {
            var model = new FOPostalDispatchPageViewModel();
            try
            {
                model = await BuildPostalDispatchViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetPostalDispatchPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildPostalDispatchViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_PostalDispatchTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PostalDispatchTablePartial", new FOPostalDispatchPageViewModel());
            }
        }


        public async Task<IActionResult> AddPostalDispatch(int? id)
        {
            var model = new FOPostalDispatchAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/VisitorBook"
               );

                var country = await _countryService.GetAllAsync(await GetCompanyId(), await GetSessionId());
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPostalDispatchByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
                }
                model.Country = country.Data;
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
        /// Fetches one record for editing. Notably these two don't check permissions
        /// before returning data — worth a look if that's intentional, since the sibling actions elsewhere in the file do check.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPostalDispatch(int id)
        {
            try
            {
                var r = await _client.GetPostalDispatchByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SavePostalDispatch([FromForm] FOPostalDispatchUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {

                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;

                }
                var r = await _client.UpsertPostalDispatchAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? postalDispatchId = r.Data.Result.POSTALDISPATCHID;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.FileName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.FileName ?? "photo.jpg",
                                PhotoModule.PostalDispatch,
                                FolderNameModule.Documents,
                                postalDispatchId.Value
                            );
                            var attchment = new FOPostalDispatchAttachmentUpsertRequest
                            {
                                PostalDispatchID = postalDispatchId.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType

                            };
                            var attachment = await _client.UpsertPostalDispatchAttachmentFileAsync(attchment);
                        }
                    }
                }
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeletePostalDispatch([FromBody] List<int> id)
        {
            try
            {
                var r = await _client.DeletePostalDispatchAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> TogglePostalDispatchStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _client.TogglePostalDispatchStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> DownloadDispatchAttachment(int id)
        {
            try
            {
                //var r = await _client.GetPostalDispatchByIDAsync(id);
                //if (!r.Success || r.Data?.Attachment == null) return NotFound();

                //string contentType = r.Data.FileType ?? "application/octet-stream";
                //string fileName = r.Data.FileName ?? $"dispatch_attachment_{id}";

                //return File(r.Data.Attachment, contentType, fileName);


                var r = await _client.GetPostalDispatchByIDAsync(id);

                if (!r.Success || string.IsNullOrWhiteSpace(r.Data?.Attachment))
                    return NotFound();

                // Full physical path
                var filePath = Path.Combine(
                    _environment.WebRootPath,
                    r.Data.Attachment.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                );

                if (!System.IO.File.Exists(filePath))
                    return NotFound("File not found.");

                var fileName = Path.GetFileName(filePath);

                return PhysicalFile(
                    filePath,
                    "application/octet-stream",
                    fileName);

            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Shows the 'Phone Call Log' page, where staff can record details of incoming and outgoing calls.
        /// </summary>
        /// 

        public async Task<FOPhoneCallLogPageViewModel> BuildPhoneCallLogPageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId,
    int? sessionID, string? callType)
        {
            var model = new FOPhoneCallLogPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/FrontOffice/PhoneCallLog");

                var resolvedCompanyId = companyId ?? await GetCompanyId();
                var resolvedSessionId = sessionID ?? await GetSessionId();

                var getstaffId = GetStaffID();
                if (getstaffId == null || getstaffId == 0)
                {
                    getstaffId = GetStaffID();
                    getstaffId = (getstaffId ?? 0) <= 0 ? null : getstaffId;
                }

                var request = new FOPhoneCallLogSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = resolvedCompanyId,
                    SessionID = resolvedSessionId,
                    CallType = callType ?? null
                };

                var phoneCallLogsResponse = _client.GetAllPhoneCallLogsWithPageAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(phoneCallLogsResponse, sessionTask, companiesTask);

                var pagedResult = await phoneCallLogsResponse;

                model = new FOPhoneCallLogPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPhoneCallLogViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = resolvedCompanyId,
                    SessionId = resolvedSessionId,
                    CallType = callType
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
        //public async Task<FOPhoneCallLogPageViewModel> BuildPhoneCallLogPageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId,
        //int? sessionID, string? callType)
        //{
        //    var model = new FOPhoneCallLogPageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions("/FrontOffice/PhoneCallLog");

        //        var resolvedCompanyId = companyId ?? await GetCompanyId();
        //        var resolvedSessionId = sessionID ?? await GetSessionId();

        //        var getstaffId = GetStaffID();
        //        if (getstaffId == null || getstaffId == 0)
        //        {
        //            getstaffId = GetStaffID();
        //            getstaffId = (getstaffId ?? 0) <= 0 ? null : getstaffId;
        //        }

        //        var request = new FOPhoneCallLogSearchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            CompanyID = resolvedCompanyId,
        //            SessionID = resolvedSessionId,
        //            CallType = callType ?? null
        //        };

        //        var res = await _client.GetAllPhoneCallLogsAsync();

        //        var phoneCallLogsResponse = _client.GetAllPhoneCallLogsWithPageAsync(request);


        //        var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);
        //        var companiesTask = _companyService.GetAllAsync()

        //        await Task.WhenAll(phoneCallLogsResponse, sessionTask, companiesTask);

        //        var pagedResult = await phoneCallLogsResponse;


        //        model = new FOPhoneCallLogPageViewModel
        //        {
        //            Items = pagedResult.Success ? pagedResult.Data.Data : new List<FOPhoneCallLogViewModel>(),
        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            CompanyId = resolvedCompanyId,
        //            SessionId = resolvedSessionId,
        //            CallType = callType
        //        };
        //        model.Permissions = perms;
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }

        //}

        public async Task<IActionResult> PhoneCallLog(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        string? callType)
        {
            var model = new FOPhoneCallLogPageViewModel();
            try
            {
                model = await BuildPhoneCallLogPageViewModel(pageIndex, pageSize, search, companyId, sessionID, callType);

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
        public async Task<IActionResult> GetPhoneCallLogPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        string? callType)
        {
            try
            {
                var model = await BuildPhoneCallLogPageViewModel(pageIndex, pageSize, search, companyId, sessionID, callType);

                return PartialView("_PhoneCallLogTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PhoneCallLogTablePartial", new FOPhoneCallLogPageViewModel());
            }
        }


        public async Task<IActionResult> AddPhoneCallLog(int? id)
        {
            var model = new FOPhoneCallLogAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/VisitorBook"
               );


                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPhoneCallLogByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
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


        [HttpGet]
        public async Task<IActionResult> GetPhoneCallLog(int id)
        {
            try
            {
                var r = await _client.GetPhoneCallLogByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SavePhoneCallLog([FromBody] FOPhoneCallLogUpsertRequest req)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertPhoneCallLogAsync(req);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> DeletePhoneCallLog([FromBody] List<int> id)
        {
            try
            {
                var r = await _client.DeletePhoneCallLogAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> TogglePhoneCallLogStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _client.TogglePhoneCallLogStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Loads the visitor list page. Also pulls in Purposes, Classes, and Staff, because the "who did they visit" / "why" 
        /// fields on the visitor form need those as dropdown sources.
        /// </summary>

        public async Task<FOVisitorBookPageViewModel> BuildVisitorBookPageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID, int? staffId, int? studentId, int? purpose)
        {
            var model = new FOVisitorBookPageViewModel();
            try
            {
                var perms = await GetPermissions("/FrontOffice/VisitorBook");

                var resolvedCompanyId = companyId ?? await GetCompanyId();
                var resolvedSessionId = sessionID ?? await GetSessionId();

                var getstaffId = GetStaffID();
                if (getstaffId == null || getstaffId == 0)
                {
                    getstaffId = GetStaffID();
                    getstaffId = (getstaffId ?? 0) <= 0 ? null : getstaffId;
                }
                var request = new FOVisitorBookSerchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = resolvedCompanyId,
                    SessionID = resolvedSessionId,
                    StaffID = staffId ?? getstaffId,
                    StudentID = studentId ?? null,
                    Purposes = purpose
                };

                var visitors = _client.GetAllVisitorsWithPageIndexAsync(request);
                var purposes = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "PURPOSE");
                var classes = await _classClient.GetAllAsync(false, request.SessionID, request.CompanyID, request.StaffID);
                var staff = await _hrClient.GetAllStaffAsync(request.CompanyID, request.SessionID, request.StaffID);

                // ✅ use resolvedCompanyId here — this was the source of duplicate sessions
                var sessionTask = _sessionService.GetAllAsync(false, resolvedCompanyId);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(visitors, sessionTask, companiesTask);
                var pagedResult = await visitors;

                model = new FOVisitorBookPageViewModel
                {
                    Visitors = pagedResult.Success ? pagedResult.Data.Data : new List<FOVisitorBookViewModel>(),
                    Purposes = purposes.Success ? purposes.Data : new List<DropdownModel>(),
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = resolvedCompanyId,
                    SessionId = resolvedSessionId,
                    StaffId = request.StaffID,
                    StudentId = request.StudentID
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

        //public async Task<FOVisitorBookPageViewModel> BuildVisitorBookPageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID, int? staffId, int? studentId, int? purpose)
        //{
        //    var model = new FOVisitorBookPageViewModel();
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions("/FrontOffice/VisitorBook");

        //        var resolvedCompanyId = companyId ?? await GetCompanyId();
        //        var resolvedSessionId = sessionID ?? await GetSessionId();

        //        var getstaffId = GetStaffID();
        //        if (getstaffId == null || getstaffId == 0)
        //        {
        //            getstaffId = GetStaffID();
        //            getstaffId = (getstaffId ?? 0) <= 0 ? null : getstaffId;
        //        }
        //        var request = new FOVisitorBookSerchRequest
        //        {
        //            PageNumber = pageIndex ?? 1,
        //            PageSize = pageSize ?? 10,
        //            SearchKeyword = search,
        //            //CompanyID = companyId ?? await GetCompanyId(),
        //            //SessionID = sessionID ?? await GetSessionId(),
        //            CompanyID = resolvedCompanyId,
        //            SessionID = resolvedSessionId,
        //            StaffID = staffId ?? getstaffId,
        //            StudentID = studentId ?? null,
        //            Purposes=purpose
        //        };

        //        var sessionId = await GetSessionId();
        //        var visitors = _client.GetAllVisitorsWithPageIndexAsync(request);
        //        var purposes = await _client.GetSetUpFOMasterDropdowmListAsync(request.CompanyID, request.SessionID, "PURPOSE");
        //        var classes = await _classClient.GetAllAsync(false, request.SessionID, request.CompanyID, request.StaffID);
        //        var staff = await _hrClient.GetAllStaffAsync(request.CompanyID,request.SessionID,request.StaffID);
        //        var sessionTask = _sessionService.GetAllAsync(false, companyId);
        //        var companiesTask = _companyService.GetAllAsync();

        //        await Task.WhenAll(visitors, sessionTask, companiesTask);
        //        var pagedResult = await visitors;
        //        model = new FOVisitorBookPageViewModel
        //        {
        //            Visitors = pagedResult.Success ? pagedResult.Data.Data : new List<FOVisitorBookViewModel>(),
        //            Purposes = purposes.Success ? purposes.Data : new List<DropdownModel>(),
        //            Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
        //            Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),

        //            Companies = (await companiesTask).Data ?? new(),
        //            Sessions = (await sessionTask).Data ?? new(),
        //            TotalRecords = pagedResult.Data.TotalRecords,
        //            PageNumber = pagedResult.Data.PageNumber,
        //            PageSize = pagedResult.Data.PageSize,
        //            SearchTerm = search,
        //            CompanyId = resolvedCompanyId,
        //            SessionId = resolvedSessionId,
        //            StaffId = request.StaffID,
        //            StudentId = request.StudentID
        //        };
        //        model.Permissions = perms;
        //        return model;
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return model;
        //    }
        //}

        public async Task<IActionResult> VisitorBook(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID, int? staffId,
        int? studentId, int? purpose)
        {
            var model = new FOVisitorBookPageViewModel();
            try
            {
                model = await BuildVisitorBookPageViewModel(pageIndex, pageSize, search,
                    companyId, sessionID, staffId, studentId, purpose);

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
        public async Task<IActionResult> GetVisitorBookPartial(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID, int? staffId,
        int? studentId, int? purpose)
        {
            try
            {
                var model = await BuildVisitorBookPageViewModel(pageIndex, pageSize, search, companyId, sessionID, staffId, studentId, purpose);

                return PartialView("_VisitorBookTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VisitorBookTablePartial", new FOVisitorBookPageViewModel());
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetSections(int classId)
        {
            try
            {
                var r = await _sectionClient.GetByClassAsync(classId);
                return Json(new { success = r.Success, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetStudents(int classId, int sectionId)
        {
            try
            {
                var reqModel = new StudentDropDwonBindRequestModel
                {
                    SessionID = await GetSessionId(),
                    CompanyID = await GetCompanyId(),
                    ClassID = classId,
                    SectionID = sectionId,
                    UserId = GetUserId()
                };

                //int companyId = await GetCompanyId();
                // int sessionId = await GetSessionId();
                //var r = await _studentClient.GetStudentListAsync(companyId, sessionId, classId, sectionId);
                var r = await _studentClient.GetStudentBindAsync(reqModel);
                return Json(new { success = r.Success, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetAllStaff()
        {
            try
            {
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var r = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                return Json(new { success = r.Success, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetStudentByID(int id)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var r = await _studentClient.GetStudentByIDAsync(id, companyId, sessionId);
                return Json(new { success = r.Success, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetVisitor(int id)
        {
            try
            {
                var r = await _client.GetVisitorByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SaveVisitor([FromForm] FOVisitorBookUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;

                }
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertVisitorAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? visitorBookId = r.Data.Result.VISITORBOOKID;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.FileName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.FileName ?? "photo.jpg",
                                PhotoModule.VisitorBook,
                                FolderNameModule.Documents,
                                visitorBookId.Value
                            );
                            var attchment = new FOVisitorBookAttachmentUpsertRequest
                            {
                                VisitorBookID = visitorBookId.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType

                            };
                            var attachment = await _client.UpsertVisitorAttachmentFileAsync(attchment);
                        }
                    }
                }

                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteVisitor([FromBody] List<int> id)
        {
            try
            {
                var r = await _client.DeleteVisitorAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ToggleVisitorStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _client.ToggleVisitorStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Shows the 'Admission Inquiry' page, where the school records potential students who have asked about joining.
        /// Users can filter inquiries by date, source (like 'Website'), or class.
        /// </summary>
        public async Task<FOAdmissionInquiryPageViewModel> BuildAdmissionInquiryPageViewModel(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int? sourceId = 0,
            int? classId = 0,
            string? status = null,
            int? pageIndex = null,
        int? pageSize = null,
        string? search = null,
        int? companyId = null,
        int? sessionID = null)
        {
            var model = new FOAdmissionInquiryPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/AdmissionInquiry"
               );
                var req = new EnquirySearchRequest
                {
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    FromDate = fromDate ?? null,
                    ToDate = toDate ?? null,
                    SourceID = sourceId ?? null,
                    ClassID = classId ?? null,
                    Status = status ?? null,
                    SearchKeyword = search ?? null,
                    PageNumber = pageIndex,
                    PageSize = pageSize,


                };
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var inquiries = _client.GetAllAdmissionInquiriesWithPageIndexAsync(req);
                var classes = await _classClient.GetAllAsync(false, req.SessionID, req.CompanyID);
                var sources = await _client.GetSetUpFOMasterDropdowmListAsync(req.CompanyID.Value, req.SessionID.Value, "SOURCE");
                var references = await _client.GetSetUpFOMasterDropdowmListAsync(req.CompanyID.Value, req.SessionID.Value, "REFERENCE");
                var staff = await _hrClient.GetAllStaffAsync(req.CompanyID.Value, req.SessionID.Value, staffId);

                var sessionTask = _sessionService.GetAllAsync(false, req.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(inquiries, sessionTask, companiesTask);

                var pagedResult = await inquiries;

                model = new FOAdmissionInquiryPageViewModel
                {
                    Inquiries = pagedResult.Success ? pagedResult.Data.Data : new List<FOAdmissionInquiryViewModel>(),
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Sources = sources.Success ? sources.Data : new List<DropdownModel>(),
                    References = references.Success ? references.Data : new List<DropdownModel>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = req.CompanyID,
                    SessionId = req.SessionID,
                    TotalRecords = pagedResult.Success ? pagedResult.Data.TotalRecords : 0
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


        public async Task<IActionResult> AdmissionInquiry(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int? sourceId = 0,
            int? classId = 0,
            string? status = null,
            int? pageIndex = null,
        int? pageSize = null,
        string? search = null,
        int? companyId = null,
        int? sessionID = null)
        {
            var model = new FOAdmissionInquiryPageViewModel();
            try
            {
                model = await BuildAdmissionInquiryPageViewModel(fromDate, toDate, sourceId, classId, status,
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
        public async Task<IActionResult> GetAdmissionInquiryPartial(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int? sourceId = 0,
            int? classId = 0,
            string? status = null,
            int? pageIndex = null,
        int? pageSize = null,
        string? search = null,
        int? companyId = null,
        int? sessionID = null)
        {
            try
            {
                var model = await BuildAdmissionInquiryPageViewModel(fromDate, toDate, sourceId, classId, status,
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_AdmissionInquiryTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_AdmissionInquiryTablePartial", new FOAdmissionInquiryPageViewModel());
            }
        }



        [HttpGet]
        public async Task<IActionResult> GetInquiry(int id)
        {
            try
            {
                var r = await _client.GetAdmissionInquiryByIDAsync(id);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetAllInquiriesJson(DateTime? fromDate = null, DateTime? toDate = null, int sourceId = 0, int classId = 0, string? status = null)
        {
            try
            {
                var r = await _client.GetAllAdmissionInquiriesAsync(fromDate, toDate, sourceId, classId, status);
                return Json(new { success = r.Success, message = r.Message, data = r.Data });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SaveInquiry([FromBody] FOAdmissionInquiryUpsertRequest req)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var r = await _client.UpsertAdmissionInquiryAsync(req);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> DeleteInquiry([FromBody] List<int> id)
        {
            try
            {
                var r = await _client.DeleteAdmissionInquiryAsync(id);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SaveFollowUp([FromBody] FOInquiryFollowUpSaveRequest req)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return Json(new { success = false, message = "Validation Error: " + errors });
                }
                var r = await _client.SaveInquiryFollowUpAsync(req);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> DownloadVisitorAttachment(int id)
        {
            try
            {
                var r = await _client.GetVisitorByIDAsync(id);

                if (!r.Success || string.IsNullOrWhiteSpace(r.Data?.Attachment))
                    return NotFound();

                // Full physical path
                var filePath = Path.Combine(
                    _environment.WebRootPath,
                    r.Data.Attachment.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                );

                if (!System.IO.File.Exists(filePath))
                    return NotFound("File not found.");

                var fileName = Path.GetFileName(filePath);

                return PhysicalFile(
                    filePath,
                    "application/octet-stream",
                    fileName);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        [SkipPermissionCheck]
        [HttpGet]
        public async Task<IActionResult> InquiryFollowUp(int id)
        {
            var model = new FOAdmissionInquiryViewModel();
            try
            {

                model = (await _client.GetAdmissionInquiryByIDAsync(id)).Data;

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> AddAdmissionEnquiry(int? id)
        {
            var model = new AddAdmissionInquiryPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/AdmissionInquiry"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                //var inquiries = await _client.GetAdmissionInquiryByIDAsync(id);
                var classes = await _classClient.GetAllAsync(false, sessionId, companyId, staffId);
                var sources = await _client.GetSetUpFOMasterDropdowmListAsync(companyId, sessionId, "SOURCE");
                var references = await _client.GetSetUpFOMasterDropdowmListAsync(companyId, sessionId, "REFERENCE");
                var staff = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                var country = await _countryService.GetAllAsync(await GetCompanyId(), await GetSessionId());
                model = new AddAdmissionInquiryPageViewModel
                {
                    //Inquiries = inquiries.Success ? inquiries.Data : new FOAdmissionInquiryViewModel(),
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Sources = sources.Success ? sources.Data : new List<DropdownModel>(),
                    References = references.Success ? references.Data : new List<DropdownModel>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>()
                };
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetAdmissionInquiryByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Inquiries = response.Data;
                        model.EditInquiries = response.Data;
                    }
                }
                else
                {
                    model.EditInquiries = null;
                }
                model.Country = country.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> AddVisitorBook(int? id)
        {
            var model = new AddVisitorBookPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/VisitorBook"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }


                var visitors = await _client.GetAllVisitorsAsync(false, companyId, sessionId);
                var purposes = await _client.GetSetUpFOMasterDropdowmListAsync(companyId, sessionId, "PURPOSE");
                var classes = await _classClient.GetAllAsync(false, sessionId, companyId);
                var staff = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);

                model = new AddVisitorBookPageViewModel
                {
                    //Visitors = visitors.Success ? visitors.Data : new List<FOVisitorBookViewModel>(),
                    Purposes = purposes.Success ? purposes.Data : new List<DropdownModel>(),
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>()
                };
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetVisitorByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Visitors = response.Data;
                        model.EditVisitors = response.Data;
                    }
                }
                else
                {
                    model.EditVisitors = null;
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


        public async Task<IActionResult> ViewPostalReceive(int? id)
        {
            var model = new FOPostalReceiveViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PostalReceive"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPostalReceiveByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model = response.Data;
                    }
                }
                else
                {
                    model = null;
                }
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> ViewPostalDispatch(int? id)
        {
            var model = new FOPostalDispatchViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PostalDispatch"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPostalDispatchByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model = response.Data;
                    }
                }
                else
                {
                    model = null;
                }
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> ViewPhoneCallLog(int? id)
        {
            var model = new FOPhoneCallLogViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PhoneCallLog"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetPhoneCallLogByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model = response.Data;
                    }
                }
                else
                {
                    model = null;
                }
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> ViewVisitorBook(int? id)
        {
            var model = new FOVisitorBookViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PhoneCallLog"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetVisitorByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model = response.Data;
                    }
                }
                else
                {
                    model = null;
                }
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> ViewComplaint(int? id)
        {
            var model = new FOComplaintViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/PhoneCallLog"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetComplaintByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model = response.Data;
                    }
                }
                else
                {
                    model = null;
                }
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
