using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Data;
using System.Security.Claims;

namespace SchoolERPWebConsole.Controllers
{
    public class DownloadCenterController : BaseController
    {
        private readonly IDownloadCenterClientService _service;
        private readonly ICompanyClientService _companyService;
        private readonly IClassClientService _classService;
        private readonly ISectionClientService _sectionService;
        private readonly ISessionClientService _sessionService;
        private readonly IRoleClientService _roleService;
        private readonly IWebHostEnvironment _env;
        
        private readonly IUserClientService _userClient;
        public DownloadCenterController(
            IDownloadCenterClientService service,
            ICompanyClientService companyService,
            IClassClientService classService,
            ISectionClientService sectionService,
            ISessionClientService sessionService,
            IWebHostEnvironment env, PermissionHelper permHelper, IUserClientService userClient, IRoleClientService roleService) : base(permHelper)
        {
            _service = service;
            _companyService = companyService;
            _classService = classService;
            _sectionService = sectionService;
            _sessionService = sessionService;
            _env = env;
            _userClient = userClient;
            _roleService = roleService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value ?? "0");
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

        #region Content Type
        

        public async Task<ContentTypePageViewModel> BuildContentTypePageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new ContentTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryBudget/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _service.GetAllContentTypeWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new ContentTypePageViewModel
                {
                    ContentType = pagedResult.Success ? pagedResult.Data.Data : new List<ContentTypeViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyID = request.CompanyID
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


        public async Task<IActionResult> ContentType(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new ContentTypePageViewModel();
            try
            {
                model = await BuildContentTypePageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetContentTypePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildContentTypePageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_ContentTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ContentTypeTablePartial", new ContentTypePageViewModel());
            }
        }

        public async Task<IActionResult> AddContentType(int? id)
        {
            var model = new ContentTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _service.GetContentTypeById(id.Value);
                    model = new ContentTypeAddViewModel
                    {
                        EditItems = res.Success ? res.Data : new ContentTypeViewModel()
                    };
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
        public async Task<IActionResult> GetContentTypeList(int? companyId = null)
        {
            var response =await _service.GetContentTypeList(null, companyId);
            return Json(new { response.Success, response.Data });
        }

        [HttpGet]
        public IActionResult GetContentType(int id)
        {
            var data = _service.GetContentTypeById(id);
            return Json(new { success = data != null, data });
        }

        [HttpPost]
        public async Task<IActionResult> UpsertContentType([FromBody] ContentTypeUpsertRequest req)
        {
            try
            {
                if(req.CompanyID==0 || req.CompanyID == null) 
                {
                    req.CompanyID = await GetCompanyId();
                }
                var res = await _service.UpsertContentTypeAsync(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception  ex)
            {
                throw;
            }
           
        }

        [HttpPost]
        public async Task<IActionResult> DeleteContentType([FromBody] List<int> id)
        {
            var res =await _service.DeleteContentType(id);
            return Json(new
            {
                success = res.Success,
                message = res.Message
            });
        }
        [HttpPost]
        public async Task<IActionResult> CopyContentType([FromBody] CopyForCompanyRequest request)
        {
            try
            {
                var response = await _service.CopyContentTypeAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _service.ToggleContentTypeStatus(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
           
        }
        #endregion

        #region Video Tutorial
       
        public async Task<IActionResult> AddVideoTutorial(int? id)
        {
            var model = new AddVideoTutorialViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _service.GetVideoTutorialById(id.Value);
                    model = new AddVideoTutorialViewModel
                    {
                        EditItems = res.Success ? res.Data : new VideoTutorialViewModel()
                    };
                }
                else
                {
                    model.EditItems = null;
                }
                var classes = await _classService.GetAllAsync(false,await GetSessionId(),await GetCompanyId());
                model.Classes = classes.Data ?? new List<MstClassViewModel>();
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }

        }
        public async Task<IActionResult> ViewVideoTutorial(int? id)
        {
            var model = new AddVideoTutorialViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _service.GetVideoTutorialById(id.Value);
                    model = new AddVideoTutorialViewModel
                    {
                        EditItems = res.Success ? res.Data : new VideoTutorialViewModel()
                    };
                }
                else
                {
                    model.EditItems = null;
                }
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
                model.Classes = classes.Data ?? new List<MstClassViewModel>();
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
        public async Task<IActionResult> GetVideoTutorialList(int? classId, int? sectionId, string? search)
        {
            var data =await _service.GetVideoTutorialList(classId, sectionId, search);
            return Json(new { success = true, data });
        }

        public async Task<VideoTutorialPageViewModel> BuildVideoTutorialPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? classId,
        int? sectionId)
        {
            var model = new VideoTutorialPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/DownloadCenter/VideoTutorial"
                );
                

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    ClassID = classId,
                    SectionID=sectionId
                };
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());

                var role = User.FindFirst("UserTypeName")?.Value;
                if (role.Trim() == "Student" || role.Trim() == "Parent")
                {
                    classId = int.Parse(User.FindFirst("ClassID")?.Value);
                    sectionId = int.Parse(User.FindFirst("SectionID")?.Value);
                    request.ClassID = classId;
                    request.SectionID = sectionId;

                    var classResponse = await _classService.GetByIDAsync(classId.Value);

                    if (classResponse.Success && classResponse.Data != null)
                    {
                        // Wrap the single record into a list
                        model.Classes = new List<MstClassViewModel> { classResponse.Data };
                    }
                }
                else
                {
                    model.Classes = classes.Data ?? new List<MstClassViewModel>();
                }
                request.CompanyID = await GetCompanyId();
                var sessionId = await GetSessionId();
                var budgetResponse = _service.GetAllVideoTutoriaWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);               
                var pagedResult = await budgetResponse;
                model.VideoTutorial = pagedResult.Success ? pagedResult.Data.Data : new List<VideoTutorialViewModel>();
                model.Companies = (await companiesTask).Data ?? new();
                model.TotalRecords = pagedResult.Data.TotalRecords;
                model.PageNumber = pagedResult.Data.PageNumber;
                model.PageSize = pagedResult.Data.PageSize;
                model.SearchTerm = search;
                model.CompanyID = request.CompanyID;                
                model.Permissions = perms;
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }


        public async Task<IActionResult> VideoTutorial(int? pageIndex,
        int? pageSize,
        string? search,
        int? classId,
        int? sectionId)
        {
            var model = new VideoTutorialPageViewModel();
            try
            {
                model = await BuildVideoTutorialPageViewModel(pageIndex, pageSize, search, classId, sectionId);

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
        public async Task<IActionResult> GetVideoTutorialPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? classId,
        int? sectionId)
        {
            try
            {
                var model = await BuildVideoTutorialPageViewModel(pageIndex, pageSize, search, classId, sectionId);

                return PartialView("_VideoTutorialTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VideoTutorialTablePartial", new VideoTutorialPageViewModel());
            }
        }

        [HttpGet]
        public IActionResult GetVideoTutorial(int id)
        {
            var data = _service.GetVideoTutorialById(id);
            return Json(new { success = data != null, data });
        }

        [HttpPost]
        public async Task<IActionResult> UpsertVideoTutorial([FromBody] VideoTutorialUpsertRequest req)
        {
            try
            {
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                var res = await _service.UpsertVideoTutorial(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteVideoTutorial([FromBody] List<int> id)
        {
            try
            {
                var res = await _service.DeleteVideoTutorial(id);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> ToggleVideoStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _service.ToggleVideoTutorialStatus(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }
        #endregion

        #region Upload Content        

        public async Task<SharedLinkPageViewModel> BuildUploadContentPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? contenttypeId)
        {
            var model = new SharedLinkPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/DownloadCenter/UploadContent"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    ContenttypeId = contenttypeId
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _service.GetAllContentWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);
                var contentTypes = await _service.GetContentTypeList(null, await GetCompanyId());
                var pagedResult = await budgetResponse;

                model = new SharedLinkPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<ContentViewModel>(),
                    ContentType = contentTypes.Success ? contentTypes.Data : new List<ContentTypeViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyID = request.CompanyID
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


        public async Task<IActionResult> UploadContent(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? contenttypeId)
        {
            var model = new SharedLinkPageViewModel();
            try
            {
                model = await BuildUploadContentPageViewModel(pageIndex, pageSize, search, companyId, contenttypeId);

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
        public async Task<IActionResult> GetUploadContentPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? contenttypeId)
        {
            try
            {
                var model = await BuildUploadContentPageViewModel(pageIndex, pageSize, search, companyId, contenttypeId);

                return PartialView("_UploadContentTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_UploadContentTablePartial", new SharedLinkPageViewModel());
            }
        }

        public async Task<IActionResult> AddUploadContent(int? id)
        {
            var model = new AddSharedLinkViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/DownloadCenter/UploadContent"
               );
                if (id.HasValue && id.Value > 0)
                {
                    var res = await _service.GetContentTypeById(id.Value);
                    model = new AddSharedLinkViewModel
                    {
                        //EditItems = res.Success ? res.Data : new ContentTypeViewModel()
                    };
                }
                else
                {
                    model.EditItems = null;
                }
                var contentTypes = await _service.GetContentTypeList(null, await GetCompanyId());
                model.ContentType = contentTypes?.Data;
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
        [SkipPermissionCheck]
        public async Task<IActionResult> GenerateURL()
        {
            var model = new AddSharedLinkViewModel();
            try
            {
                var perms = await GetPermissions("/DownloadCenter/UploadContent");

                var contentTypes = await _service.GetContentTypeList(null, await GetCompanyId());
                var rolelist = await _userClient.GetRolesDropdownAsync();
                var classes = await _classService.GetAllAsync(false,await GetSessionId(),await GetCompanyId());
                model.ContentType = contentTypes?.Data;
                model.RoleList = rolelist.Success ? rolelist.Data : new List<RoleViewModel>();
                model.Classes = classes.Success ? classes.Data : new List<MstClassViewModel>();
                model.Permissions = perms;
                model.EditItems = null;

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        [SkipPermissionCheck]
        public async Task<IActionResult> ShareURL()
        {
            var model = new AddSharedLinkViewModel();
            try
            {
                var perms = await GetPermissions("/DownloadCenter/UploadContent");

                var contentTypes = await _service.GetContentTypeList(null, await GetCompanyId());
                var rolelist = await _userClient.GetRolesDropdownAsync();
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId());
                model.ContentType = contentTypes?.Data;
                model.RoleList = rolelist.Success ? rolelist.Data : new List<RoleViewModel>();
                model.Classes = classes.Success ? classes.Data : new List<MstClassViewModel>();
                model.Permissions = perms;
                model.EditItems = null;

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }
        [HttpGet]
        public async Task<IActionResult> GetContentList(string? search)
        {
            var res =await _service.GetContentList(search);
            return Json(new { res.Success, res.Data });
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB — adjust to your max upload size
        public async Task<IActionResult> SaveUploadContent(
    [FromForm] string title,
    [FromForm] int contentTypeId,
    [FromForm] string? videoLink,
    [FromForm] int? companyid,
    [FromForm] IFormFile? file)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(title))
                    return Json(new { success = false, message = "Title is required." });

                if (contentTypeId <= 0)
                    return Json(new { success = false, message = "Please select a content type." });

                if (companyid == null || companyid == 0)
                {
                    companyid = await GetCompanyId();
                }

                var userId = GetUserId();
                string fileType = "Link";
                string? fileName = null;
                string filePath = (videoLink ?? "").Trim();
                string? fileSize = null;

                // ────────────────────────────────────────────────────────────
                // VIDEO-ONLY VALIDATION (server-side — never trust the client)
                // ────────────────────────────────────────────────────────────
                var allowedVideoExtensions = new[] { ".mp4", ".mov", ".avi", ".wmv", ".webm", ".mkv", ".m4v" };
                var allowedVideoMimeTypes = new[]
                {
            "video/mp4", "video/quicktime", "video/x-msvideo",
            "video/x-ms-wmv", "video/webm", "video/x-matroska"
        };

                if (file != null && file.Length > 0)
                {
                    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

                    if (!allowedVideoExtensions.Contains(ext) || !allowedVideoMimeTypes.Contains(file.ContentType?.ToLowerInvariant()))
                    {
                        return Json(new { success = false, message = "Only video files are allowed (MP4, MOV, AVI, WMV, WEBM, MKV)." });
                    }

                    fileType = "File";
                    fileName = file.FileName;
                    fileSize = (file.Length / 1024.0 / 1024.0).ToString("0.##") + " MB";

                    var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "download_center");
                    if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

                    var uniqueFileName = Guid.NewGuid().ToString() + ext;
                    var path = Path.Combine(uploadDir, uniqueFileName);

                    using (var stream = new FileStream(path, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    filePath = "/uploads/download_center/" + uniqueFileName;
                }

                if (string.IsNullOrEmpty(filePath))
                {
                    return Json(new { success = false, message = "Please upload a video file or provide a video link." });
                }

                var res = await _service.SaveUploadContentAsync(title, contentTypeId, fileType, fileName, filePath, fileSize, companyid.Value);

                if (!res.Success)
                {
                    // Surface the real reason the service rejected it, instead of a silent generic failure
                   // _logger.LogWarning("SaveUploadContentAsync failed. Title={Title}, FileType={FileType}, FilePath={FilePath}, Reason={Reason}",
                      //  title, fileType, filePath, res.Message);
                }

                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                // Log the FULL exception (with stack trace) so link-only failures are actually diagnosable
               // _logger.LogError(ex, "SaveUploadContent failed. Title={Title}, ContentTypeId={ContentTypeId}, HasFile={HasFile}, VideoLink={VideoLink}",
                   // title, contentTypeId, file != null, videoLink);

                return Json(new { success = false, message = "Unable to save content: " + ex.Message });
            }
        }
        [HttpPost]
        public async Task<IActionResult> DeleteContent(int id)
        {
            var res =await _service.DeleteContent(id);
            return Json(new { success = res.Success, message = res.Message });
        }

        [HttpPost]
        [SkipPermissionCheck]
        public async Task<IActionResult> GenerateSharedLink([FromBody] SharedLinkUpsertRequest req)
        {
            try
            {
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                var res = await _service.GenerateSharedLink(req);
                return Json(new { success = res.Success, message = res.Message, token = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
           
        }

        [HttpPost]
        public async Task<IActionResult> GenerateWithSendTypeShared([FromBody] GenerateSharedLinkRequest req)
        {
            try
            {
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                var res = await _service.GenerateWithSendTypeSharedLinkWith(req);
                return Json(new { success = res.Success, message = res.Message, token = res.Data.Token });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetSharedLinkList()
        {
            var res =await _service.GetSharedLinkList();
            return Json(new { success = true, res.Data });
        }



        [HttpPost]
        public async Task<IActionResult> DeleteSharedLink([FromBody] List<int> id)
        {
            var res =await _service.DeleteSharedLink(id);
            return Json(new { success = res.Success, message = res.Message });
        }
        #endregion

        [HttpGet]
        public async Task<IActionResult> GetSections(int classId)
        {
            try
            {
                var sections = (await _sectionService.GetByClassAsync(classId)).Data;
                return Json(sections);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

       
        public async Task<SharedLinkViewPageModel> BuildContentSharePageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new SharedLinkViewPageModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/LibraryBudget/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var budgetResponse = _service.GetAllSharedLinkWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(budgetResponse, companiesTask);

                var pagedResult = await budgetResponse;

                model = new SharedLinkViewPageModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<SharedLinkViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyID = request.CompanyID
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


        public async Task<IActionResult> ContentShareList(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new SharedLinkViewPageModel();
            try
            {
                model = await BuildContentSharePageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetContentSharePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildContentSharePageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_ContentShareTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ContentShareTablePartial", new SharedLinkViewPageModel());
            }
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsersByRole(int roleId, string term)
        {
            try
            {

                var sections = await _roleService.GetAllRolesBySearchAsync(roleId, term,await GetCompanyId(),await GetSessionId());
                return Json(sections.Data);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
