using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Globalization;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the school's expenses, including recording new costs and managing different types of expense categories.
    /// </summary>
    public class ExpenseController : BaseController
    {
        private readonly IAccountHeadClientService _headClient;
        private readonly IAccountEntryClientService _entryClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        public ExpenseController(IAccountHeadClientService headClient, IConfiguration configuration,
            IAccountEntryClientService entryClient, 
            PermissionHelper permHelper,
            ICompanyClientService companyService,
            ISessionClientService sessionService
            , IPhotoUploadService photoService, IWebHostEnvironment environment) : base(permHelper)
        {
            _headClient = headClient;
            _entryClient = entryClient;
            _companyService = companyService;
            _sessionService = sessionService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
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
        /// Shows the main expense recording page, displaying recent expenses and allowing you to pick a category for new ones.
        /// </summary>
       public async Task<AccountEntryPageViewModel> BuildAccountEntryViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new AccountEntryPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Expense/Index"
               );

                var request = new AccountHeadSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    HeadType = "Expense"
                };

                var res = _entryClient.GetAllAccountEntriesdWithPageIndexAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(res, sessionTask, companiesTask);

                var pagedResult = await res;
                var resHeads = await _headClient.GetAllAccountHeadsAsync("Expense",true,request.CompanyID,request.SessionID);

                
                model = new AccountEntryPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<AccountEntryViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    EntryType = request.HeadType,
                    Heads= resHeads.Success ? resHeads.Data : new List<AccountHeadViewModel>()
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

        public async Task<IActionResult> Index(int? pageIndex,
      int? pageSize,
      string? search,
      int? companyId,
      int? sessionID)
        {
            var model = new AccountEntryPageViewModel();
            try
            {
                model = await BuildAccountEntryViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetAccountEntryPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildAccountEntryViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_AccountEntryTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_AccountEntryTablePartial", new AccountEntryPageViewModel());
            }
        }


        public async Task<IActionResult> AddExpense(int? id)
        {
            var model = new AccountEntryAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Expense/ExpenseHead"
               );
                var resHeads = await _headClient.GetAllAccountHeadsAsync("Expense",true,await GetCompanyId(),await GetSessionId());
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _entryClient.GetAccountEntryByIDAsync(id.Value);
                    //model = new AccountEntryAddPageViewModel
                    //{
                    //    EditItems = res.Success ? res.Data : new AccountEntryViewModel(),
                    //    HeadType = "Expense"
                    //};
                }
                else 
                {
                    model.EditItems = null;
                }

                model.Heads = resHeads.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<AccountHeadPageViewModel> BuildExpenseHeadViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new AccountHeadPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Expense/ExpenseHead"
               );

                var request = new AccountHeadSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    HeadType = "Expense"
                };

                var res = _headClient.GetAllAccountHeadWithPageIndexAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(res, sessionTask, companiesTask);

                var pagedResult = await res;


                model = new AccountHeadPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<AccountHeadViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    HeadType=request.HeadType
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

        public async Task<IActionResult> ExpenseHead(int? pageIndex,
      int? pageSize,
      string? search,
      int? companyId,
      int? sessionID)
        {
            var model = new AccountHeadPageViewModel();
            try
            {
                model = await BuildExpenseHeadViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetExpenseHeadPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildExpenseHeadViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_ExpenseHeadTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ExpenseHeadTablePartial", new AccountHeadPageViewModel());
            }
        }


        public async Task<IActionResult> AddExpenseHead(int? id)
        {
            var model = new AccountHeadAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Expense/ExpenseHead"
               );
                if (id.HasValue && id.Value > 0) 
                {
                    var res = await _headClient.GetAccountHeadByIDAsync(id.Value);
                    //model = new AccountHeadAddPageViewModel
                    //{
                    //    EditItems = res.Success ? res.Data : new AccountHeadViewModel(),
                    //    HeadType = "Expense"
                    //};
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

        


        public async Task<AccountEntrySearchViewModel> BuildSearchViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        DateTime? DateFrom,
        DateTime? DateTo,
        string? SearchType,
        int? companyId,
        int? sessionID)
        {
            var model = new AccountEntrySearchViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Expense/Index"
               );

                var request = new AccountEntrySearchRequest
                {
                    PageIndex = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyId = companyId ?? await GetCompanyId(),
                    SessionId = sessionID ?? await GetSessionId(),
                    EntryType = "Expense",
                    SearchType= SearchType
                };

                var res = _entryClient.SearchAccountEntriesAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(res, sessionTask, companiesTask);

                var pagedResult = await res;
                var resHeads = await _headClient.GetAllAccountHeadsAsync("Expense", true, request.CompanyId, request.SessionId);


                model = new AccountEntrySearchViewModel
                {
                    Results = pagedResult.Success ? pagedResult.Data.Data : new List<AccountEntryViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchKeyword = search,
                    CompanyId = request.CompanyId,
                    SessionId = request.SessionId,
                    EntryType= request.EntryType,
                    Heads = resHeads.Success ? resHeads.Data : new List<AccountHeadViewModel>()
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

        public async Task<IActionResult> Search(int? pageIndex,
        int? pageSize,
        string? search,
        DateTime? DateFrom,
        DateTime? DateTo,
        string? SearchType,
        int? companyId,
        int? sessionID)
        {
            var model = new AccountEntrySearchViewModel();
            try
            {
                model = await BuildSearchViewModel(pageIndex, pageSize, search, DateFrom, DateTo, SearchType, companyId, sessionID);

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
        public async Task<IActionResult> GetSearchEntryPartial(
    int? pageIndex,
    int? pageSize,
    string? search,
    string? DateFrom,     // CHANGED: string, not DateTime?
    string? DateTo,       // CHANGED: string, not DateTime?
    string? SearchType,
    int? companyId,
    int? sessionID)
        {
            try
            {
                DateTime? parsedDateFrom = ParseFilterDate(DateFrom);
                DateTime? parsedDateTo = ParseFilterDate(DateTo);

                var model = await BuildSearchViewModel(
                    pageIndex, pageSize, search,
                    parsedDateFrom, parsedDateTo,
                    SearchType, companyId, sessionID);

                return PartialView("_SearchEntryTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_SearchEntryTablePartial", new AccountEntrySearchViewModel());
            }
        }

        private static DateTime? ParseFilterDate(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            // Matches the datetimepicker's format: 'DD-MM-YYYY'
            if (DateTime.TryParseExact(
                    value,
                    "dd-MM-yyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var parsed))
            {
                return parsed;
            }

            return null; // swallow bad input rather than 500ing on a malformed date
        }
        #region Account Head API Endpoints
        [HttpGet]
        public async Task<IActionResult> GetAccountHeadByID(int id)
        {
            var res = await _headClient.GetAccountHeadByIDAsync(id);
            return Json(res);
        }

        [HttpPost]
        public async Task<IActionResult> UpsertAccountHead([FromBody] AccountHeadUpsertRequest req)
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
                var res = await _headClient.UpsertAccountHeadAsync(req);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAccountHead([FromBody] List<int> id)
        {
            try
            {
                var res = await _headClient.DeleteAccountHeadAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> ToggleAccountHeadStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _headClient.ToggleAccountHeadStatusAsync(request);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }
        #endregion

        #region Account Entry API Endpoints
        [HttpGet]
        public async Task<IActionResult> GetAccountEntryByID(int id)
        {
            var res = await _entryClient.GetAccountEntryByIDAsync(id);
            return Json(res);
        }

        [HttpPost]
        public async Task<IActionResult> UpsertAccountEntry([FromForm] AccountEntryUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (req.CompanyID == 0)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0)
                {
                    req.SessionID = await GetSessionId();
                }

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;
                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }
                    req.AttachDocName = attachmentFile.FileName;
                    req.AttachDocType = attachmentFile.ContentType;
                }
                else if (req.RemoveAttachment)
                {
                    // user explicitly removed the existing attachment, no new file provided
                    req.AttachDoc = null;
                    req.AttachDocName = null;
                    req.AttachDocType = null;
                }
                else
                {
                    // no new file, not removed -> keep whatever was already on record
                    req.AttachDocName = req.ExistingFileName;
                }

                var r = await _entryClient.UpsertAccountEntryAsync(req);

                if (r.Data?.Result?.Result == 1)
                {
                    int? accountEntryID = r.Data.Result.ACCOUNTENTRYID;

                    if (attachmentFile != null && attachmentFile.Length > 0 && accountEntryID.HasValue)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);
                        byte[] fileBytes = memoryStream.ToArray();

                        var photoResult = await _photoService.SaveBase64PhotoAsync(
                            Convert.ToBase64String(fileBytes),
                            req.AttachDocName ?? "photo.jpg",
                            PhotoModule.Event,
                            FolderNameModule.Documents,
                            accountEntryID.Value
                        );

                        var attachmentReq = new AccountEntryAttachmentUpsertRequest
                        {
                            AccountEntryID = accountEntryID.Value,
                            Attachment = photoResult.PhotoUrl,
                            FileName = attachmentFile.FileName,
                            FileType = attachmentFile.ContentType
                        };
                        await _entryClient.UpsertAccountEntryAttachmentFileAsync(attachmentReq);
                    }
                }

                return Json(r);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAccountEntry([FromBody]  List<int> id)
        {
            var res = await _entryClient.DeleteAccountEntryAsync(id);
            return Json(res);
        }

        [HttpPost]
        public async Task<IActionResult> ToggleAccountEntryStatus([FromBody] StatusUpdateRequest request)
        {
            var res = await _entryClient.ToggleAccountEntryStatusAsync(request);
            return Json(res);
        }
        #endregion


        [HttpPost]
        public async Task<IActionResult> CopyAccountHead([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _headClient.CopyAccountHeadAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetAllAccountHead(int companyId, int sessionId)
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
                var response = await _headClient.GetAllAccountHeadsAsync("Expense", false,companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
