using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class EmailTemplateController : BaseController
    {
        // Permission key used for both the list page and the add/edit page.
        private const string PermissionPath = "/SMSTemplate/Index";

        private readonly IEmailTemplateClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        /// <summary>
        /// Initializes a new instance of the <see cref="SMSTemplateController"/> class.
        /// </summary>
        public EmailTemplateController(IEmailTemplateClientService client,
            ICompanyClientService companyService, IConfiguration configuration, IPhotoUploadService photoService,
            IWebHostEnvironment environment,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
        }

        /// <summary>
        /// Gets the logged-in user's id from the auth claims (0 if not found).
        /// </summary>
        private int GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("UserId");
            return int.TryParse(claim?.Value, out var id) ? id : 0;
        }

        /// <summary>
        /// Gets the current company ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetCompanyId()
        {
            int current = Convert.ToInt32(CurrentCompanyId);   // works for int and int?
            if (current > 0)
                return current;

            var response = await _companyService.GetUserCurrentCompanyAsync();
            return response?.Data ?? 0;
        }

        /// <summary>
        /// Builds the view model for the Email Template list page (permissions, companies, templates).
        /// </summary>

        private async Task<EmailTemplatePageViewModel> BuildEmailTemplatePageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            var model = new EmailTemplatePageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/AccountType/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var itemCategory = _client.GetAllSMSTemplateWithPageAsync(request);

                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, companiesTask);

                var pagedResult = await itemCategory;

                model = new EmailTemplatePageViewModel
                {
                    EmailTemplate = pagedResult.Success ? pagedResult.Data.Data : new List<EmailTemplateViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID
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
        /// Displays the main Email Template list page.
        /// </summary>
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            var model = new EmailTemplatePageViewModel();
            try
            {
                model = await BuildEmailTemplatePageViewModel(pageIndex, pageSize, search, companyId);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the table partial (AJAX endpoint for filter / search / paging).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetEmailTemplatePartial(int? pageIndex, int? pageSize, string? search, int? companyId)
        {
            try
            {
                var model = await BuildEmailTemplatePageViewModel(pageIndex, pageSize, search, companyId);
                return PartialView("_EmailTemplateTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_EmailTemplateTablePartial", new EmailTemplateViewModel());
            }
        }

        /// <summary>
        /// Add / Edit page. id = null or 0 -> add, id > 0 -> edit.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new EmailTemplateAddViewModel { EditEmailTemplate = null };
            try
            {
                model.Permissions = await GetPermissions(PermissionPath);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response != null && response.Success && response.Data != null)
                    {
                        model.EditEmailTemplate = response.Data;
                    }
                    else
                    {
                        TempData["Error"] = response?.Message ?? "Email template not found.";
                    }
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
        /// Deletes one or more Email templates by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                if (ids == null || ids.Count == 0)
                    return Json(new { success = false, message = "Please select at least one Email template." });

                var response = await _client.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Activates / deactivates one or more Email templates.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (request == null)
                    return Json(new { success = false, message = "Invalid request." });

                var response = await _client.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates (SMSTemplateId = 0) or updates (SMSTemplateId > 0) an Email template.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromForm] EmailTemplateSaveRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (req == null)
                    return Json(new { success = false, message = "Invalid request." });

                // Server-side validation (the JS check can be bypassed)
                req.Title = (req.Title ?? string.Empty).Trim();
                req.Message = (req.Message ?? string.Empty).Trim();

                if (req.Title.Length == 0)
                    return Json(new { success = false, message = "SMS title is required." });

                if (req.Message.Length == 0)
                    return Json(new { success = false, message = "SMS message is required." });

                if (req.Title.Length > 500)
                    return Json(new { success = false, message = "SMS title cannot exceed 500 characters." });

                req.DisplayLabel = string.IsNullOrWhiteSpace(req.DisplayLabel)
                    ? req.Title
                    : req.DisplayLabel.Trim();

                if (req.DisplayLabel.Length > 500)
                    return Json(new { success = false, message = "Display name cannot exceed 500 characters." });

                if (req.CompanyID == null || req.CompanyID == 0)
                    req.CompanyID = await GetCompanyId();

                // The SP needs these for history + audit
                req.UserId = GetLoggedInUserId();
                req.IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString();


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

                var r = await _client.UpsertSMSTemplateAsync(req);
                if (r.Data != null)
                {
                    int? emailTemplateId = r.Data.EmailTemplateId;

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
                                PhotoModule.EmailTemplate,
                                FolderNameModule.Documents,
                                emailTemplateId.Value
                            );

                            var attchment = new EmailTemplateAttachmentRequest
                            {
                                EmailTemplateId = emailTemplateId.Value,
                                Attachment = photoResult.PhotoUrl,
                                AttachmentName = photoResult.FileName,
                                AttachmentType = attachmentFile.ContentType
                            };
                            var attachment = await _client.UpdateEmailTemplateAttachmentAsync(attchment);
                        }
                    }
                    else if (removeAttachment && emailTemplateId.HasValue)
                    {
                        // ── NEW: no new file uploaded, but user explicitly removed the old one ──
                        var clearReq = new EmailTemplateAttachmentRequest
                        {
                            EmailTemplateId = emailTemplateId.Value,
                            Attachment = null,
                            AttachmentName = null,
                            AttachmentType = null
                        };
                        await _client.UpdateEmailTemplateAttachmentAsync(clearReq);

                        // Optional: if you also need to delete the physical file from disk/blob storage,
                        // fetch the OLD attachment path before UpsertComplaintAsync overwrites it,
                        // then delete it here via your photo/file service, e.g.:
                        // await _photoService.DeletePhotoAsync(oldAttachmentPath);
                    }
                }
                
                if (r == null || !r.Success || r.Data == null)
                    return Json(new { success = false, message = r?.Message ?? "Unable to save Email template." });

                // SP returns RESULT = 1 on success, 0 on validation/DB failure
                return Json(new { success = r.Data.Result == 1, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
