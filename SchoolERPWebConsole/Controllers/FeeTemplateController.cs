using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class FeeTemplateController : BaseController
    {
        private readonly IFeeTemplateClientService _client;
        private readonly ICategoryGroupClientService _categoryGroupClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IClassClientService _classService;
        private readonly IFeeCategoryClientService _feeCategoryClient;
        private readonly IStudentInformationClientService _studentService;
        private readonly IFeeHeadClientService _feeHeadService;

        /// <summary>
        /// Initializes a new instance of the <see cref="FeeTemplateController"/> class.
        /// </summary>
        public FeeTemplateController(IFeeTemplateClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, ICategoryGroupClientService categoryGroupClient,
            IClassClientService classService, IFeeCategoryClientService feeCategoryClient,
            IStudentInformationClientService studentService, IFeeHeadClientService feeHeadService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _categoryGroupClient = categoryGroupClient;
            _classService = classService;
            _feeCategoryClient = feeCategoryClient;
            _studentService = studentService;
            _feeHeadService = feeHeadService;
        }

        /// <summary>
        /// Gets the current company ID, fetching from the service if not cached.
        /// </summary>
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
        /// Gets the current session ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int GetUserId() => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value, out var id) ? id : 0;
        // -----------------------------------------------------------
        // GET: /FeeTemplate/Add?id=123
        // Loads the screen: dropdown source lists + the record being
        // edited (if any). Installment / Admission Type are static,
        // so they are NOT fetched or passed here - they are hard-coded
        // directly in the .cshtml view.
        // -----------------------------------------------------------
        public async Task<IActionResult> Add(int? id)
        {
            var model = new FeeTemplateAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Add");
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var classList = await _classService.GetAllAsync(false, sessionId, companyId);
                var studentCategory = await _studentService.GetAllStudentCategories(sessionId, companyId, true);
                var feeCategory = await _feeCategoryClient.GetFeeCategoryDropdownListAsync(companyId, sessionId);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value, companyId, sessionId);
                    if (response.Success)
                    {
                        model.EditFeeTemplet = response.Data;
                    }
                }
                else
                {
                    model.EditFeeTemplet = null;
                }

                model.ClassList = classList.Data ?? new List<MstClassViewModel>();
                model.StudentCategory = studentCategory.Data ?? new List<StudentCategoryViewModel>();
                model.FeeCategory = feeCategory.Data ?? new List<DropdownModel>();
                model.Permissions = perms;

                ViewBag.CompanyId = companyId;
                ViewBag.SessionId = sessionId;
                ViewBag.UserId = GetUserId();

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // -----------------------------------------------------------
        // GET: /FeeTemplate/GetByID?id=123&companyId=&sessionId=
        // Called by FeeTemplate.js for RESET / COPY reloads (AJAX),
        // separate from the full-page Add(id) load above.
        // -----------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetByID(int id, int companyId, int sessionId)
        {
            try
            {
                if (id <= 0)
                {
                    return Json(new FeeTemplateGetByIdResponse { RESULT = 0, MESSAGE = "VALID FEE TEMPLATE ID IS REQUIRED" });
                }
                if (companyId <= 0) 
                {
                    companyId = await GetCompanyId();
                }
                if (sessionId <= 0)
                {
                    sessionId = await GetSessionId();
                }
                
                var response = await _client.GetByIDAsync(id, companyId, sessionId);
                if (!response.Success || response.Data == null)
                {
                    return Json(new FeeTemplateGetByIdResponse { RESULT = 0, MESSAGE = response.Message ?? "FEE TEMPLATE NOT FOUND" });
                }

                return Json(response.Data);
            }
            catch (Exception ex)
            {
                return Json(new FeeTemplateGetByIdResponse { RESULT = 0, MESSAGE = "UNABLE TO FETCH FEE TEMPLATE. PLEASE TRY AGAIN.", TECHNICALMESSAGE = ex.Message });
            }
        }

        // -----------------------------------------------------------
        // POST: /FeeTemplate/Save
        // Handles both INSERT (FEETEMPLATEID == 0) and UPDATE.
        // -----------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] FeeTemplateSaveRequest request)
        {
            try
            {
                if (request == null)
                {
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "INVALID REQUEST" });
                }

                request.COMPANYID = await GetCompanyId();
                request.SESSIONID = await GetSessionId();
                request.USERID = GetUserId();
                request.IPADDRESS = HttpContext?.Connection?.RemoteIpAddress?.ToString();

                // ---- basic server-side validation, mirrors the JS validation ----
                if (request.CLASSID <= 0)
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "CLASS IS REQUIRED" });

                if (request.SECTIONID <= 0)
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "SECTION IS REQUIRED" });

                if (request.INSTALLMENTID <= 0)
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "INSTALLMENT IS REQUIRED" });

                if (string.IsNullOrWhiteSpace(request.ADMISSIONTYPE))
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "ADMISSION TYPE IS REQUIRED" });

                if (request.DETAILS == null || !request.DETAILS.Any(d => !d.ISDELETE))
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "AT LEAST ONE FEE HEAD ROW IS REQUIRED" });

                var duplicateFeeHead = request.DETAILS
                    .Where(d => !d.ISDELETE)
                    .GroupBy(d => d.FEEHEADID)
                    .Any(g => g.Count() > 1);

                if (duplicateFeeHead)
                    return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "DUPLICATE FEE HEAD FOUND IN GRID" });

                var response = await _client.UpsertFeeTemplateAsync(request);
                return Json(response.Data ?? new FeeTemplateResponse { RESULT = 0, MESSAGE = response.Message ?? "UNABLE TO SAVE FEE TEMPLATE." });
            }
            catch (Exception ex)
            {
                return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "UNABLE TO SAVE FEE TEMPLATE. PLEASE TRY AGAIN.", TECHNICALMESSAGE = ex.Message });
            }
        }

        // -----------------------------------------------------------
        // POST: /FeeTemplate/Delete/123
        // Soft-deletes the whole Fee Template (header + its detail rows).
        // -----------------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
               
                var response = await _client.DeleteAsync(ids);                
                return Json(response.Data ?? new FeeTemplateResponse { RESULT = 0, MESSAGE = response.Message ?? "UNABLE TO DELETE FEE TEMPLATE." });
            }
            catch (Exception ex)
            {
                return Json(new FeeTemplateResponse { RESULT = 0, MESSAGE = "UNABLE TO DELETE FEE TEMPLATE. PLEASE TRY AGAIN.", TECHNICALMESSAGE = ex.Message });
            }
        }

        // -----------------------------------------------------------
        // GET: /FeeTemplate/GetFeeHeadDropdown?companyId=&sessionId=
        // Used to populate the "Select" Fee Head dropdown in the grid's
        // add-row. Class / Section / Installment / Admission Type are
        // NOT sourced here - Installment & Admission Type stay static
        // in the view, per requirement.
        // -----------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetFeeHeadDropdown(int companyId, int sessionId)
        {
            try
            {
                if(companyId == 0) 
                {
                    companyId = await GetCompanyId();
                }
                if (sessionId == 0) 
                {
                    sessionId = await GetSessionId();
                }
                var response = await _feeHeadService.GetFeeHeadDropdownListAsync(companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data ?? new List<DropdownModel>() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, data = new List<DropdownModel>() });
            }
        }

        /// <summary>
        /// Builds the view model for the Fee Template page,
        /// including permissions, companies, sessions and fee templates.
        /// </summary>
        private async Task<FeeTemplatePageViewModel>
            BuildFeeTemplatePageViewModel(
                int? pageIndex,
                int? pageSize,
                string? search,
                int? companyId,
                int? sessionID,
                int? classId = null,
                int? sectionId = null,
                int? installmentId = null,
                bool? isActive = null)
        {
            var model = new FeeTemplatePageViewModel();

            try
            {
                var perms = await GetPermissions("/Index");

                var request = new FeeTemplateSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,

                    SearchKeyword = search,

                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),

                    ClassID = classId,
                    SectionID = sectionId,
                    InstallmentID = installmentId,

                    IsActive = isActive,

                    SortColumn = "CLASSNAME",
                    SortDirection = "ASC"
                };

                var classList = await _classService.GetAllAsync(false, request.CompanyID, request.SectionID);

                var feeTemplateTask =
                    _client.GetPageIndexAsync(request);

                var sessionTask =
                    _sessionService.GetAllAsync(
                        false,
                        request.CompanyID);

                var companiesTask =
                    _companyService.GetAllAsync();

                await Task.WhenAll(
                    feeTemplateTask,
                    sessionTask,
                    companiesTask);

                var pagedResult = await feeTemplateTask;

                var apiData = pagedResult.Data;

                model = new FeeTemplatePageViewModel
                {
                    FeeTemplates = apiData.DATA,

                    Classes= classList.Data,

                    Companies =
                        (await companiesTask).Data ?? new(),

                    Sessions =
                        (await sessionTask).Data ?? new(),

                    TotalRecords =
                        apiData?.TOTALRECORDS ?? 0,

                    PageNumber =
                        apiData?.PAGEINDEX ?? request.PageNumber,

                    PageSize =
                        apiData?.PAGESIZE ?? request.PageSize,

                    SearchTerm = search,

                    CompanyId = request.CompanyID,

                    SessionId = request.SessionID,

                    ClassId = request.ClassID,

                    SectionId = request.SectionID,

                    InstallmentId = request.InstallmentID,

                    IsActive = request.IsActive,

                    SortColumn = request.SortColumn,

                    SortDirection = request.SortDirection,

                    Permissions = perms
                };

                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        /// <summary>
        /// Displays the main Fee Template page.
        /// </summary>
        public async Task<IActionResult> Index(
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId,
            int? sessionID,
            int? classId,
            int? sectionId,
            int? installmentId,
            bool? isActive)
        {
            var model = new FeeTemplatePageViewModel();

            try
            {
                model = await BuildFeeTemplatePageViewModel(
                    pageIndex,
                    pageSize,
                    search,
                    companyId,
                    sessionID,
                    classId,
                    sectionId,
                    installmentId,
                    isActive);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;

                return View(model);
            }
        }

        /// <summary>
        /// Returns the Fee Template table partial with pagination.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetFeeTemplatePartial(
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId,
            int? sessionID,
            int? classId,
            int? sectionId,
            int? installmentId,
            bool? isActive)
        {
            try
            {
                var model = await BuildFeeTemplatePageViewModel(
                    pageIndex,
                    pageSize,
                    search,
                    companyId,
                    sessionID,
                    classId,
                    sectionId,
                    installmentId,
                    isActive);

                return PartialView(
                    "_FeeTemplateTablePartial",
                    model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;

                return PartialView(
                    "_FeeTemplateTablePartial",
                    new FeeTemplatePageViewModel());
            }
        }
    }
}