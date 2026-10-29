using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Text.Json;

namespace SchoolERPWebConsole.Controllers
{
    public class HomeworkController : BaseController
    {
        private readonly IHomeworkClientService _homeworkClient;
        private readonly IClassClientService _classClient;
        private readonly ISubjectGroupClientService _subjectGroupClient;
        private readonly ISubjectClientService _subjectClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private const string MenuPath = "/Homework/Add";
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        public HomeworkController(
            IHomeworkClientService homeworkClient, 
            IClassClientService classClient, 
            ISubjectGroupClientService subjectGroupClient,
            ISubjectClientService subjectClient,
            ICompanyClientService companyService,
            ISessionClientService sessionService,
            IUserMenuPermissionClientService menuPerm,
            IConfiguration configuration,
            IPhotoUploadService photoService,
            IWebHostEnvironment environment,PermissionHelper permHelper) : base(permHelper)
        {
            _homeworkClient = homeworkClient;
            _classClient = classClient;
            _subjectGroupClient = subjectGroupClient;
            _subjectClient = subjectClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _sessionService = sessionService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
        }

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
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        public async Task<HomeworkPageViewModel> BuildHomeworkPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,string mode)
        {
            var model = new HomeworkPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Homework/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    Mode = mode,
                    StudentId = int.TryParse(User.FindFirst("StudentID")?.Value, out var id)
                                ? id
                                : (int?)null
                };

                //THIS SECTION IF STUDENT LLOADING CHECK ONLY HER CLASS AND SECTION HOME WORK 
                var role = User.FindFirst("UserTypeName")?.Value;
                if (role.Trim() == "Student" || role.Trim() == "Parent")
                {
                    request.ClassID = int.Parse(User.FindFirst("ClassID")?.Value);
                    request.SectionID = int.Parse(User.FindFirst("SectionID")?.Value);
                    ViewBag.IsStudent = true;
                }

                var sessionId = await GetSessionId();
                var classesResponse = _homeworkClient.GetAllHomeWorkWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new HomeworkPageViewModel
                {
                    Homeworks = pagedResult.Success ? pagedResult.Data.Data : new List<HomeworkViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SectionID
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
        int? sessionID, string mode)
        {
            var model = new HomeworkPageViewModel();
            try
            {
                model = await BuildHomeworkPageViewModel(pageIndex, pageSize, search, companyId, sessionID, mode);

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
        public async Task<IActionResult> GetHomeworkPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, string mode)
        {
            try
            {
                var model = await BuildHomeworkPageViewModel(pageIndex, pageSize, search, companyId, sessionID, mode);

                return PartialView("_HomeworkTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_HomeworkTablePartial", new HomeworkPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {

            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Homework/Index"
               );
                var model = new HomeworkAddViewModel();
                var classes = await _classClient.GetAllAsync(false,await GetSessionId(),await GetCompanyId());
                
                if (id.HasValue && id.Value > 0)
                {
                    var attechment = await _homeworkClient.GetAllHomeWorkAttechmentByIdAsync(id.Value);
                    var response = await _homeworkClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Homeworks = response.Data;
                        model.EditHomeworks = response.Data;
                    }
                    model.EditHomeworks.AttechmetDocument = attechment.Data;
                }
                else
                {
                    model.EditHomeworks = null;
                }                
                model.Classes = classes.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            
        }

        #region Homework API Proxy Endpoints

        [HttpGet]
        public async Task<IActionResult> GetSubjectGroups()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _subjectGroupClient.GetAllAsync(false, sessionId, companyId);
                return Json(res);
            }
            catch (Exception ex)
            {

                throw;
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> GetSubjectGroupByID(int id)
        {
            var res = await _subjectClient.GetSubjectGropBySubjectDropdownList(id);
            return Json(res);
        }

        [HttpGet]
        public async Task<IActionResult> GetSubjects()
        {
            var request = new SubjectSearchRequest
            {
                PageNumber = 1,
                PageSize = 10,
                SearchKeyword = null,
                CompanyID = await GetCompanyId(),
                SessionID = await GetSessionId()
            };
            var res = await _subjectClient.GetAllAsync(request);
            return Json(res);
        }

        [HttpGet]
        public async Task<IActionResult> GetHomeworkByID(int id)
        {
            var res = await _homeworkClient.GetByIDAsync(id);
            return Json(res);
        }

        [HttpPost]
        public async Task<IActionResult> UpsertHomework([FromForm] HomeworkUpsertRequest request, List<IFormFile>? attachmentFiles)
        {
            try
            {
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();
                var isCreate = request.HomeworkID <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add homework." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit homework." });

                var res = await _homeworkClient.UpsertAsync(request);
                if (res?.Data is JsonElement json)
                {
                    int homeworkId = json.GetProperty("data").GetInt32();

                    var attachmentRows = new List<object>();

                    // ── New uploads ──
                    if (attachmentFiles != null && attachmentFiles.Count > 0)
                    {
                        foreach (var file in attachmentFiles)
                        {
                            if (file == null || file.Length == 0) continue;

                            using var memoryStream = new MemoryStream();
                            await file.CopyToAsync(memoryStream);
                            byte[] fileBytes = memoryStream.ToArray();

                            var photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                file.FileName,
                                PhotoModule.Homework,
                                FolderNameModule.Documents,
                                homeworkId
                            );

                            attachmentRows.Add(new
                            {
                                AttachmentID = 0,
                                AttachmentPath = photoResult.PhotoUrl,
                                AttachmentName = photoResult.FileName,
                                AttachmentType = file.ContentType,
                                IsActive = true,
                                IsDelete = false
                            });
                        }
                    }

                    // ── Deleted attachments (Option B) ──
                    if (request.DeletedAttachmentIds != null && request.DeletedAttachmentIds.Count > 0)
                    {
                        foreach (var attachmentId in request.DeletedAttachmentIds.Distinct())
                        {
                            if (attachmentId <= 0) continue;

                            attachmentRows.Add(new
                            {
                                AttachmentID = attachmentId,
                                AttachmentPath = (string?)null,
                                AttachmentName = (string?)null,
                                AttachmentType = (string?)null,
                                IsActive = false,
                                IsDelete = true
                            });
                        }
                    }

                    if (attachmentRows.Count > 0)
                    {
                        var attachmentRequest = new HomeworkAttachmentUpsertRequest
                        {
                            HomeworkID = homeworkId,
                            CompanyID = request.CompanyID,
                            SessionID = request.SessionID,
                            AttachmentsJson = JsonSerializer.Serialize(attachmentRows)
                        };

                        var attachmentRes = await _homeworkClient.UpsertAttachmentAsync(attachmentRequest);
                    }
                }

                return Json(res);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteHomework([FromBody] List<int> ids)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "You do not have permission to delete homework." });

                var res = await _homeworkClient.DeleteAsync(ids);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> ToggleHomeworkStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change homework status." });

                var res = await _homeworkClient.ToggleStatusAsync(request);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            
        }

        #endregion


        //Homework Details

        public async Task<IActionResult> HomeworkDetails(int? id) 
        {
            try
            {
                var perms = await GetPermissions(
                   "/Homework/HomeworkDetails"
               );
                int? studentId = int.TryParse(User.FindFirst("StudentID")?.Value, out var sId)
                                ? sId
                                : (int?)null;
                var model = new HomeWorkAddDetailsViewModel();
                var homework = await _homeworkClient.GetByIDAsync(id.Value, studentId);
                if(homework != null) 
                {
                    if(homework.Data != null) 
                    {
                        if(homework.Data?.SubmissionID != null) 
                        {
                            int? submissionID = homework.Data?.SubmissionID;
                            var homeworksubmission = await _homeworkClient.GetAllHomeWorkSubmissionAttechmentByIdAsync(submissionID);
                            model.HomeWorkSubmissionAttechment = homeworksubmission.Data;

                        }
                    }
                }
                
                model.Homeworks = homework.Data;
                model.Permissions = perms;
                model.HomeworkID = id;
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> EvaluateHomework(int? homeWorkId, int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID) 
        {
            try
            {
                var perms = await GetPermissions(
                  "/Homework/HomeworkDetails"
              );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    HomeWorkId = homeWorkId,
                    StudentId = int.TryParse(User.FindFirst("StudentID")?.Value, out var id)
                                ? id
                                : (int?)null
                };

                var homeworkResponse =await _homeworkClient.GetAllHomeWorkSubmissionWithPageAsync(request);

                var pagedResult = homeworkResponse;
                var model = new HomeworkEvaluateViewModel
                {
                    HomeworkSubmissions = pagedResult.Success ? pagedResult.Data.Data : new List<HomeworkSubmissionListDto>()                    
                };
                var homework = await _homeworkClient.GetByIDAsync(homeWorkId.Value);
                model.Homeworks = homework.Data;
                model.Permissions = perms;
                model.HomeworkID = homeWorkId;
                //HomeworkSubmissions
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpsertSubmission([FromForm] HomeworkSubmissionUpsertRequest request, List<IFormFile>? attachmentFiles)
        {
            try
            {
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();
                var studentID = int.Parse(User.FindFirst("StudentID")?.Value);
                request.StudentID = studentID;
                var isCreate = request.SubmissionID <= 0;
                
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add homework." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit homework." });

                var res = await _homeworkClient.UpsertSubmissionAsync(request);
                if (res?.Data is JsonElement json)
                {
                    // On create, the SP now returns the new ID. On update, we already have it.
                    int submissionId = json.GetProperty("data").GetInt32();

                    if (attachmentFiles != null && attachmentFiles.Count > 0)
                    {
                        var attachmentRows = new List<object>();
                        //int currentUserId = await GetCurrentUserId();

                        foreach (var file in attachmentFiles)
                        {
                            if (file == null || file.Length == 0) continue;

                            using var memoryStream = new MemoryStream();
                            await file.CopyToAsync(memoryStream);
                            byte[] fileBytes = memoryStream.ToArray();

                            var photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                file.FileName,
                                PhotoModule.Homework,          // add this enum value if it doesn't exist yet
                                FolderNameModule.Documents,
                                submissionId
                            );

                            attachmentRows.Add(new
                            {
                                AttachmentID = 0,               // 0 = new row, matches SP contract
                                AttachmentPath = photoResult.PhotoUrl,
                                AttachmentName = photoResult.FileName,
                                AttachmentType = file.ContentType,
                                IsActive = true,
                                IsDelete = false
                            });
                        }

                        if (attachmentRows.Count > 0)
                        {
                            var attachmentRequest = new HomeworkSubmissionAttachmentUpsertRequest
                            {
                                SubmissionID = submissionId,
                                CompanyID = request.CompanyID,
                                SessionID = request.SessionID,
                                AttachmentsJson = JsonSerializer.Serialize(attachmentRows)
                            };

                            var attachmentRes = await _homeworkClient.UpsertSubmissionAttachmentAsync(attachmentRequest);
                        }
                    }
                }
                return Json(res);
            }
            catch (Exception)
            {
                throw;
            }

        }


        [HttpPost]
        public async Task<IActionResult> UpsertEvaluateHomewor([FromBody] HomeworkSubmissionEvaluateUpsertRequest request)
        {
            try
            {
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();
                var isCreate = request.HomeworkID <= 0;

                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add homework." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit homework." });

                var res = await _homeworkClient.UpsertEvaluateHomeworkAsync(request);
             
                return Json(res);
            }
            catch (Exception)
            {
                throw;
            }

        }

    }
}
