using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class CommunicationController : BaseController
    {
        private readonly ICommunicationClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IClassClientService _classService;
        private readonly IUserClientService _userClient;
        private readonly IEmailTemplateClientService _emailTemplateClient;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        private readonly ISMSTemplateClientService _smsTemplateClient;
        /// <summary>
        /// Initializes a new instance of the <see cref="CommunicationController"/> class.
        /// </summary>
        public CommunicationController(ICommunicationClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IClassClientService classService, 
            IUserClientService userClient, IEmailTemplateClientService emailTemplateClient, IConfiguration configuration, IPhotoUploadService photoService,
            IWebHostEnvironment environment, ISMSTemplateClientService smsTemplateClient) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _classService = classService;
            _userClient = userClient;
            _emailTemplateClient = emailTemplateClient;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
            _smsTemplateClient = smsTemplateClient;
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
        
        public async Task<IActionResult> SendEmail()
        {
            var model = new CommunicationViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Add");
                var rolelist = await _userClient.GetRolesDropdownAsync();
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());                
                var SmsTemplatesRespo = await _emailTemplateClient.GetEmailTemplateToDropdownListAsync(await GetCompanyId());

                var todaybrithday = new BirthdayTodayRequest
                {
                    CompanyID = await GetCompanyId(),
                    PersonType="ALL"
                };

                var todaybrithdayRes = await _client.GetTodayBirthdaysAsync(todaybrithday);                
                model.RoleList = rolelist.Success ? rolelist.Data : new List<RoleViewModel>();
                model.Classes = classes.Success ? classes.Data : new List<MstClassViewModel>();
                model.EmailTemplet = SmsTemplatesRespo.Success ? SmsTemplatesRespo.Data : new List<EmailTempletDropdwon>();
                model.BirthdayToday = todaybrithdayRes.Success ? todaybrithdayRes.Data : new List<BirthdayTodayResponse>();
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ------------------------------------------------------------------
        // Template  ->  title + message + attachment
        // ------------------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetTemplate(int id)
        {
            try
            {
                var res = await _emailTemplateClient.GetByIDAsync(id);
                if (res.Data == null)
                    return Json(new { success = false, message = "Template not found." });
                return Json(new
                {
                    success = true,
                    data = new { id = res.Data.EmailTemplateId, title = res.Data.Title, message = res.Data.Message, attachment = res.Data.Attachment }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromForm] CommunicationSaveRequest req, IFormFile? attachmentFile)
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

                    req.AttachmentName = attachmentFile.FileName;
                    req.AttachmentType = attachmentFile.ContentType;
                }
                if (req.TemplateID != null)
                {
                    int? communicationID = req.TemplateID;

                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        // ── New file uploaded: save it (unchanged from your original) ──
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.AttachmentType != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.AttachmentName ?? "photo.jpg",
                                PhotoModule.EmailTemplate,
                                FolderNameModule.Documents,
                                communicationID.Value
                            );
                            req.Attachment = photoResult.PhotoUrl;
                            req.AttachmentName = photoResult.FileName;
                            req.AttachmentType = attachmentFile.ContentType;
                        }
                    }
                    else if (removeAttachment && communicationID.HasValue)
                    {
                        // ── NEW: no new file uploaded, but user explicitly removed the old one ──                       
                        req.Attachment = null;
                        req.AttachmentName = null;
                        req.Attachment = null;
                    }
                }
                var r = await _client.UpsertCommunicationAsync(req);
               
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetBirthdayToday(string? type, int? roleId)
        {
            type = (type ?? "ALL").Trim().ToUpperInvariant();
            if (type is not ("ALL" or "STUDENT" or "STAFF")) type = "ALL";

            var companyId = await GetCompanyId();
            var todaybrithday = new BirthdayTodayRequest
            {
                CompanyID = await GetCompanyId(),
                PersonType = type
            };
            var list = await _client.GetTodayBirthdaysAsync(todaybrithday);
            return Json(new { success = true, data = list });
        }

        public async Task<IActionResult> SendSMS()
        {
            var model = new CommunicationViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Add");
                var rolelist = await _userClient.GetRolesDropdownAsync();
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
                var smsTemplet = await _smsTemplateClient.GetSMSTemplateToDropdownListAsync(await GetCompanyId());

                var todaybrithday = new BirthdayTodayRequest
                {
                    CompanyID = await GetCompanyId(),
                    PersonType = "ALL"
                };

                var todaybrithdayRes = await _client.GetTodayBirthdaysAsync(todaybrithday);
                model.RoleList = rolelist.Success ? rolelist.Data : new List<RoleViewModel>();
                model.Classes = classes.Success ? classes.Data : new List<MstClassViewModel>();
                model.SmsTemplates = smsTemplet.Success ? smsTemplet.Data : new List<EmailTempletDropdwon>();
                model.BirthdayToday = todaybrithdayRes.Success ? todaybrithdayRes.Data : new List<BirthdayTodayResponse>();
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
        public async Task<IActionResult> GetSmsTemplate(int id)
        {
            try
            {
                var res = await _smsTemplateClient.GetByIDAsync(id);              // <- your service
                if (res?.Data == null) return Json(new { success = false, message = "Template not found." });
                return Json(new
                {
                    success = true,
                    data = new { id = res.Data.SMSTemplateId, title = res.Data.Title, message = res.Data.Message }
                });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }


        private static readonly HashSet<string> AllowedSortColumns = new(StringComparer.OrdinalIgnoreCase)
            {
                "TITLE", "DESCRIPTION", "DATE", "SCHEDULEDATE",
                "EMAIL", "SMS", "GROUP", "INDIVIDUAL", "CLASS"
            };

        private async Task<CommunicationLogPageViewModel> BuildPageViewModel(
        string? logType, int? pageNumber, int? pageSize, string? searchTerm,
        int? companyId, int? sessionId, DateTime? fromDate, DateTime? toDate,
        string? sortColumn, string? sortDir)
        {
            logType = string.Equals(logType, "SCHEDULE", StringComparison.OrdinalIgnoreCase) ? "SCHEDULE" : "LOG";

            var perms = await GetPermissions("/CommunicationLog/Index");
            var cid = companyId ?? await GetCompanyId();

            var request = new CommunicationLogRequest
            {
                CompanyID = cid,
                SessionID = sessionId,
                LogType = logType,
                SearchKeyword = searchTerm,
                FromDate = fromDate,
                ToDate = toDate,
                SortColumn = !string.IsNullOrWhiteSpace(sortColumn) && AllowedSortColumns.Contains(sortColumn)
                                ? sortColumn!.ToUpper() : null,
                SortDir = string.Equals(sortDir, "ASC", StringComparison.OrdinalIgnoreCase) ? "ASC" : "DESC",
                PageNumber = pageNumber ?? 1,
                PageSize = pageSize ?? 10
            };

            var logTask = _client.GetCommunicationLogWithPageAsync(request);
            var companiesTask = _companyService.GetAllAsync();
            // var sessionsTask = _sessionService.GetByCompanyAsync(cid);   // same call your Student Report uses
            await Task.WhenAll(logTask, companiesTask);

            var paged = await logTask;
            var ok = paged.Success && paged.Data != null;

            return new CommunicationLogPageViewModel
            {
                Logs = ok ? paged.Data.Data : new List<CommunicationLogResponse>(),
                TotalRecords = ok ? paged.Data.TotalRecords : 0,
                PageNumber = ok ? paged.Data.PageNumber : request.PageNumber,
                PageSize = ok ? paged.Data.PageSize : request.PageSize,
                LogType = logType,
                CompanyId = cid,
                SessionId = sessionId,
                SearchTerm = searchTerm,
                FromDate = fromDate,
                ToDate = toDate,
                SortColumn = request.SortColumn,
                SortDir = request.SortDir,
                Companies = (await companiesTask).Data ?? new(),
                // Sessions = (await sessionsTask).Data ?? new(),
                Permissions = perms
            };
        }

        /// <summary>logType = LOG (Email / SMS Log) or SCHEDULE (Schedule Email SMS Log)</summary>
        public async Task<IActionResult> Index(
            string? logType, int? pageNumber, int? pageSize, string? searchTerm,
            int? companyId, int? sessionId, DateTime? fromDate, DateTime? toDate,
            string? sortColumn, string? sortDir)
        {
            var model = new CommunicationLogPageViewModel();
            try
            {
                model = await BuildPageViewModel(logType, pageNumber, pageSize, searchTerm,
                    companyId, sessionId, fromDate, toDate, sortColumn, sortDir);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return View(model);
        }

        /// <summary>AJAX: table partial for filter / search / sort / paging</summary>
        [HttpGet]
        public async Task<IActionResult> GetCommunicationLogPartial(
            string? logType, int? pageNumber, int? pageSize, string? searchTerm,
            int? companyId, int? sessionId, DateTime? fromDate, DateTime? toDate,
            string? sortColumn, string? sortDir)
        {
            try
            {
                var model = await BuildPageViewModel(logType, pageNumber, pageSize, searchTerm,
                    companyId, sessionId, fromDate, toDate, sortColumn, sortDir);
                return PartialView("_CommunicationLogTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_CommunicationLogTablePartial", new CommunicationLogPageViewModel());
            }
        }

        /// <summary>Delete a scheduled message (SCHEDULE tab only).
        /// TODO: wire to your real delete API in the client service.</summary>
        [HttpPost, ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            try
            {
                // var res = await _client.DeleteScheduledCommunicationAsync(id);
                // return Json(new { success = res.Success, message = res.Message });
                await Task.CompletedTask;
                return Json(new { success = false, message = "Delete API not wired yet." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
