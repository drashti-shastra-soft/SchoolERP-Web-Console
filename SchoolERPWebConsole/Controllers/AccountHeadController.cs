using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class AccountHeadController : BaseController
    {
        private readonly IAccountHeadClientService _headClient;
        private readonly IAccountEntryClientService _entryClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        private readonly IAccountTypeClientService _accountType;
        private readonly ICountryClientService _countryService;
        private readonly ICostCenterClientService _costCenterService;

        /// <summary>
        /// Initializes a new instance of the <see cref="AccountHeadController"/> class with required services.
        /// </summary>
        public AccountHeadController(IAccountHeadClientService headClient, IConfiguration configuration,
            IAccountEntryClientService entryClient,
            PermissionHelper permHelper,
            ICompanyClientService companyService,
            ISessionClientService sessionService
            , IPhotoUploadService photoService, IWebHostEnvironment environment,
            IAccountTypeClientService accountType, ICountryClientService countryService,
            ICostCenterClientService costCenterService) : base(permHelper)
        {
            _headClient = headClient;
            _entryClient = entryClient;
            _companyService = companyService;
            _sessionService = sessionService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
            _accountType = accountType;
            _countryService = countryService;
            _costCenterService = costCenterService;
        }
        /// <summary>
        /// Retrieves the current user's ID from claims.
        /// </summary>
        private int GetUserId() => int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value ?? "0");

        /// <summary>
        /// Gets the current company ID for the user, fetching from the service if not cached.
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
        /// Gets the current session ID for the user, fetching from the service if not cached.
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

        /// <summary>
        /// Retrieves the staff ID from user claims if available.
        /// </summary>
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }

        /// <summary>
        /// Builds the view model for the account head page, including permissions, companies, sessions, and account heads.
        /// </summary>
        private async Task<AccountPageViewModel> BuildAccountPageViewModel(SearchAccountHeadRequest request)
        {
            var model = new AccountPageViewModel();
            try
            {
                var perms = await GetPermissions("/AccountHead/Index");

                var companyId = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                var sessionId = request.SessionID > 0 ? request.SessionID : await GetSessionId();
                request.CompanyID = companyId;
                request.SessionID = sessionId;
                
                var reportTask = _headClient.GetAllListAccountHeadWithPageIndexAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
               
                await Task.WhenAll(reportTask, sessionTask, companiesTask);

                var pagedResult = await reportTask;

                model = new AccountPageViewModel
                {
                    AccountHead = pagedResult.Success ? pagedResult.Data.Data : new List<AccountHeadModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                   
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchKeyword,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        /// <summary>
        /// Displays the main Account Head page with a list of account heads and related data.
        /// </summary>
        public async Task<IActionResult> Index(SearchAccountHeadRequest request)
        {
            var model = new AccountPageViewModel();
            try
            {
                model = await BuildAccountPageViewModel(request);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }
       
        /// <summary>
        /// Returns the partial view for the account head table with pagination (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAccountHeadPartial(SearchAccountHeadRequest request)
        {
            try
            {
                var model = await BuildAccountPageViewModel(request);
                return PartialView("_AccountHeadTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AccountHeadTablePartial", new AccountPageViewModel());
            }
        }

        /// <summary>
        /// Displays the Add/Edit Account Head page. If id is provided, loads the account head for editing.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new AddAccountHeadPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var resAccountType = await _accountType.GetAllAsync(await GetCompanyId(), await GetSessionId());
                var resParent = await _headClient.GetAccountParentDropdownListAsync(null, await GetCompanyId(), await GetSessionId());
                var country = await _countryService.GetAllAsync(await GetCompanyId(), await GetSessionId());
                var costCenter = await _costCenterService.GetAllAsync(await GetCompanyId(), await GetSessionId());
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _headClient.GetAccountHeadByIDAsync(id.Value);
                    model = new AddAccountHeadPageViewModel
                    {
                        EditAccountHead = res.Success ? res.Data : new AccountHeadModel(),
                        HeadType = "Expense"
                    };
                }
                else
                {
                    model.EditAccountHead = null;
                }
                model.CostCenterList = costCenter.Data;
                model.Country = country.Data;
                model.AccountTypeList = resAccountType.Data;
                model.ParentAccountList = resParent.Data;
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
        /// Handles the creation or update of an account head, including file attachment upload.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromForm] AccountRequest req, IFormFile? attachmentFile)
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
                var r = await _headClient.UpsertAccountHeadAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? accountID = r.Data.Result.AccountID;

                    if (attachmentFile != null && attachmentFile.Length > 0 && accountID.HasValue)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);
                        byte[] fileBytes = memoryStream.ToArray();

                        var photoResult = await _photoService.SaveBase64PhotoAsync(
                            Convert.ToBase64String(fileBytes),
                            req.AttachDocName ?? "photo.jpg",
                            PhotoModule.Account,
                            FolderNameModule.Account,
                            accountID.Value
                        );

                        var attachmentReq = new AccountEntryAttachmentUpsertRequest
                        {
                            AccountEntryID = accountID.Value,
                            Attachment = photoResult.PhotoUrl,
                            FileName = attachmentFile.FileName,
                            FileType = attachmentFile.ContentType
                        };
                        await _headClient.UpsertAccountHeadAttachmentFileAsync(attachmentReq);
                    }
                }
                return Json(r);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more account heads by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> id)
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

        /// <summary>
        /// Toggles the active/inactive status of an account head.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
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
    }
}
