using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Configuration;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class NoticeBoardController : BaseController
    {
        private readonly INoticeBoardClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IUserClientService _userClient;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        private bool _isSuperAdmin = false;
        public NoticeBoardController(INoticeBoardClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper,
            IUserClientService userClient,IConfiguration configuration, IPhotoUploadService photoService,
            IWebHostEnvironment environment) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _userClient= userClient;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
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


        // ---------- helpers ----------
        private int GetRoleId()
        {
            var roleIdClaim = User.FindFirst("RoleId")?.Value;
            int.TryParse(roleIdClaim, out int roleId);
            return roleId; // returns 0 if claim missing or invalid
        }

        private bool IsSuperAdmin()
        {
            if (User?.Identity?.IsAuthenticated != true) return false;

            return User.Claims.Any(c =>
                (string.Equals(c.Type, ClaimTypes.Role, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "Role", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "UserTypeName", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(c.Type, "UserType", StringComparison.OrdinalIgnoreCase)) &&
                IsSuperAdminValue(c.Value));
        }
        private static bool IsSuperAdminValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            var normalized = value.Replace(" ", string.Empty)
                .Replace("-", string.Empty)
                .Replace("_", string.Empty)
                .Trim();
            return string.Equals(normalized, "superadmin", StringComparison.OrdinalIgnoreCase);
        }

        private int GetUserId() =>
            int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var u) ? u : 0;

        /// <summary>
        /// Builds the view model for the Notice Board page
        /// (permissions, companies, sessions, paged notices).
        /// </summary>
        private async Task<NoticeBoardPageViewModel> BuildNoticeBoardPageViewModel(NoticeBoardSearchRequest request)
        {
            var model = new NoticeBoardPageViewModel();

            var perms = await GetPermissions("/NoticeBoard/Index");

            // ---- paging / search defaults
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;
            request.SearchKeyword = string.IsNullOrWhiteSpace(request.SearchKeyword)
                                    ? null
                                    : request.SearchKeyword.Trim();

            // ---- company / session default to the logged-in selection
            if (request.CompanyId <= 0) request.CompanyId = Convert.ToInt32(await GetCompanyId());
            if (request.SessionId <= 0) request.SessionId = Convert.ToInt32(await GetSessionId());

            // ---- role rules come from the server, not from the query string
            request.RoleId = GetRoleId();
            request.IsSuperAdmin = IsSuperAdmin();
            request.IncludeDeleted = false;
            if (!request.IsSuperAdmin)
            {
                request.IsActive = null;        
                request.FilterRoleId = null;
            }

            var noticeTask = _client.GetAllNoticeBoardWithPageAsync(request);
            var sessionTask = _sessionService.GetAllAsync(false, request.CompanyId);
            var companiesTask = _companyService.GetAllAsync();

            await Task.WhenAll(noticeTask, sessionTask, companiesTask);

            var pagedResult = await noticeTask;
            var paged = pagedResult != null && pagedResult.Success ? pagedResult.Data : null;

            model = new NoticeBoardPageViewModel
            {
                NoticeBoardModel = paged?.Data ?? new List<NoticeBoardModel>(),
                Companies = (await companiesTask)?.Data ?? new(),
                Sessions = (await sessionTask)?.Data ?? new(),
                TotalRecords = paged?.TotalRecords ?? 0,
                PageNumber = paged?.PageNumber > 0 ? paged.PageNumber : request.PageNumber,
                PageSize = paged?.PageSize > 0 ? paged.PageSize : request.PageSize,
                SearchTerm = request.SearchKeyword ?? string.Empty,
                CompanyId = request.CompanyId,
                SessionId = request.SessionId,
                FromDate = request.FromDate,
                ToDate = request.ToDate,
                IsActive = request.IsActive,
                IsSuperAdmin = request.IsSuperAdmin,
                Permissions = perms
            };

            return model;
        }

        /// <summary>
        /// Displays the main Notice Board page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Index(NoticeBoardSearchRequest request)
        {
            var model = new NoticeBoardPageViewModel();
            try
            {
                model = await BuildNoticeBoardPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new NoticeBoardAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Add");
                var colsesto = await _client.GetByIDAsync(await GetCompanyId());
                var rolelist = await _userClient.GetRolesDropdownAsync();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditNoticeBoardModel = response.Data;
                    }
                }
                else
                {
                    model.EditNoticeBoardModel = null;
                }
                model.Permissions = perms;
                model.RoleList = rolelist.Data;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromForm] NoticeBoardRequestModel req, IFormFile? attachmentFile)
        {
            try
            {
                bool isCreate = req.NoticeBoardId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                // The SP needs these for history + audit
                req.UserID = GetUserId();
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

                    req.AttachmentName = attachmentFile.FileName;
                    req.AttachmentType = attachmentFile.ContentType;
                }

                var r = await _client.UpsertNoticeBoardAsync(req);
                if (r.Data != null)
                {
                    int? noticeBoardId = r.Data.NoticeBoardId;

                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        // ── New file uploaded: save it (unchanged from your original) ──
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.AttachmentName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.AttachmentName ?? "photo.jpg",
                                PhotoModule.NoticeBoard,
                                FolderNameModule.Documents,
                                noticeBoardId.Value
                            );

                            var attchment = new NoticeBoardAttachmentRequest
                            {
                                NoticeBoardID = noticeBoardId.Value,
                                Attachment = photoResult.PhotoUrl,
                                AttachmentName = photoResult.FileName,
                                AttachmentType = attachmentFile.ContentType
                            };
                            var attachment = await _client.UpdateNoticeBoardAttachmentAsync(attchment);
                        }
                    }
                    else if (removeAttachment && noticeBoardId.HasValue)
                    {
                        // ── NEW: no new file uploaded, but user explicitly removed the old one ──
                        var clearReq = new NoticeBoardAttachmentRequest
                        {
                            NoticeBoardID = noticeBoardId.Value,
                            Attachment = null,
                            AttachmentName = null,
                            AttachmentType = null
                        };
                        await _client.UpdateNoticeBoardAttachmentAsync(clearReq);
                    }
                }
                return Json(new { success = r.Data.Result, message = r.Data.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Returns the notice table partial (AJAX: filter / search / pagination).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNoticeBoardPartial(NoticeBoardSearchRequest request)
        {
            try
            {
                var model = await BuildNoticeBoardPageViewModel(request);
                return PartialView("_NoticeBoardTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_NoticeBoardTablePartial", new NoticeBoardPageViewModel());
            }
        }

        /// <summary>
        /// Soft deletes one or more notices. Body = JSON array of ids.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                var result = await _client.DeleteAsync(ids);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Activates / deactivates notices. Body = { ids: "1,2,3", isActive: true }.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                request.DoneBy = GetUserId();                 // never trust the browser for this
                var result = await _client.ToggleStatusAsync(request);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


    }
}
