using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the school's academic structure, including Classes, Subjects, and how they are grouped together.
    /// </summary>
    public class AcademicsController : BaseController
    {
        private readonly IClassClientService _classClient;
        private readonly ISectionClientService _sectionClient;
        private readonly ISubjectClientService _subjectClient;
        private readonly ISubjectGroupClientService _subjectGroupClient;
        private readonly IAcademicsClientService _academicsClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly ISessionClientService _sessionClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private readonly ISubjectTypeClientService _subjectTypeService;
        private const string ClassMenuPath = "/Academics/Class";
        private const string SubjectMenuPath = "/Academics/Subject";
        private const string SubjectGroupMenuPath = "/Academics/SubjectGroup";
        private const string TimeTableMenuPath = "/Academics/AddTimeTable";

        public AcademicsController(
            IClassClientService classClient, 
            ISectionClientService sectionClient, 
            ISubjectClientService subjectClient, 
            ISubjectGroupClientService subjectGroupClient,
            IAcademicsClientService academicsClient,
            IHumanResourceClientService hrClient,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm, ICompanyClientService companyService,
            PermissionHelper permHelper, ISubjectTypeClientService subjectTypeService) : base(permHelper)
        {
            _classClient = classClient;
            _sectionClient = sectionClient;
            _subjectClient = subjectClient;
            _subjectGroupClient = subjectGroupClient;
            _academicsClient = academicsClient;
            _hrClient = hrClient;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _subjectTypeService = subjectTypeService;
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
                var response = await _sessionClient.GetUserCurrentSessionAsync();
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
        /// Shows the 'Class' management page where you can define, search, and filter the different grades or classes in the school.
        /// Use this to manage all classes, including pagination and filtering.
        /// </summary>
        public async Task<IActionResult> Class(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, int? sectionId, bool? isActive, int? userTypeId)
        {
            var model = new MstClassPageViewModel();
            try
            {
                 model = await BuildClassPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, sectionId, isActive, userTypeId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the class table partial view for AJAX requests, supporting pagination and filtering.
        /// Use this for dynamic updates of the class list without reloading the whole page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetClassPartial(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, int? sectionId, bool? isActive, int? userTypeId)
        {
            var model = new MstClassPageViewModel();
            try
            {
                model = await BuildClassPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, sectionId, isActive, userTypeId);

                return PartialView("_ClassTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // shared logic extracted from the original Class() action, unchanged internally
        private async Task<MstClassPageViewModel> BuildClassPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, int? sectionId, bool? isActive, int? userTypeId)
        {
            var model = new MstClassPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Academics/Class");

                var request = new ClassSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    SectionID = sectionId ?? null
                };

                var sessionId = await GetSessionId();
                var classesResponse = _classClient.GetAllClassWithPageAsync(request);
                var sectionsResponse = await _sectionClient.GetAllAsync(false, request.SessionID, request.CompanyID);
                var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);
                var pagedResult = await classesResponse;

                model = new MstClassPageViewModel
                {
                    Classes = pagedResult.Success ? pagedResult.Data.Data : new List<MstClassViewModel>(),
                    AvailableSections = sectionsResponse.Success ? sectionsResponse.Data : new List<MstSectionViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    // TotalPages = pagedResult.Data.TotalPages,          // ✅ make sure this exists on PagedResult / gets set — same TotalRecords/TotalPages mixup risk as the Section bug earlier
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;

                return model;
            }
            catch (Exception ex)
            {
                return model;
            }
            
        }


        /// <summary>
        /// Retrieves a class by its unique ID for editing.
        /// Use this to fetch class details for the edit modal or form.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetClass(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(ClassMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit classes." });
                var response = await _classClient.GetByIDAsync(id);
                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
           
        }
        /// <summary>
        /// Creates or updates a class record.
        /// Use this to add a new class or edit an existing one. Handles permission checks.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveClass([FromBody] MstClassUpsertRequest request)
        {
            try
            {
                var isCreate = request.ClassID <= 0;               
                
                if(request.SessionId==0 || request.SessionId == null) 
                {
                    request.SessionId = await GetSessionId();
                }
                if (request.CompanyId == 0 || request.CompanyId == null)
                {
                    request.CompanyId = await GetCompanyId();
                }
                if (isCreate && !(await _menuPerm.Has(ClassMenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add classes." });
                if (!isCreate && !(await _menuPerm.Has(ClassMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit classes." });
                var response = await _classClient.UpsertAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Toggles the active status (enable/disable) of one or more classes.
        /// Use this to activate or deactivate classes without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleClassStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _classClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }
        /// <summary>
        /// Deletes one or more classes by their IDs.
        /// Use this to remove classes that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteClass([FromBody] List<int> ids)
        {
            try
            {
                var response = await _classClient.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the 'Subject' management page where you can define, search, and filter all subjects taught in the school.
        /// Use this to manage all subjects, including pagination and filtering.
        /// </summary>
        // Full page load
        public async Task<IActionResult> Subject(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, bool? isActive, int? userTypeId)
        {
            var model = new MstSubjectPageViewModel();
            try
            {
                model = await BuildSubjectPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, isActive, userTypeId);

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
        public async Task<IActionResult> GetSubjectPartial(int? pageIndex, int? pageSize, string? search,
            int? companyId, int? sessionID, bool? isActive, int? userTypeId)
        {
            try
            {
                var model = await BuildSubjectPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, isActive, userTypeId);

                return PartialView("_SubjectTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SubjectTablePartial", new MstSubjectPageViewModel());
            }
        }

        // ✅ NEW — shared logic extracted from the original Subject() action, unchanged internally
        private async Task<MstSubjectPageViewModel> BuildSubjectPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, bool? isActive, int? userTypeId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/Academics/Subject");

            var request = new SubjectSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? await GetSessionId()
            };

            var sessionId = await GetSessionId();

            // ── Parallel fetch — dropdowns + paged subjects ─────────────────
            var subjectTask = _subjectClient.GetAllAsync(request);
            var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(subjectTask, sessionTask, companiesTask);

            var pagedResult = await subjectTask;

            var model = new MstSubjectPageViewModel
            {
                Subjects = pagedResult.Success ? pagedResult.Data.Data : new List<MstSubjectViewModel>(),
                TotalRecords = pagedResult.Data.TotalRecords,
                //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                CompanyId = request.CompanyID,
                SessionId = request.SessionID,
                Companies = (await companiesTask).Data ?? new(),
                Sessions = (await sessionTask).Data ?? new()
            };
            model.Permissions = perms;

            return model;
        }

        /// <summary>
        /// Retrieves a subject by its unique ID for editing.
        /// Use this to fetch subject details for the edit modal or form.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSubject(int id)
        {
            try
            {
                var response = await _subjectClient.GetByIDAsync(id);
                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }
        /// <summary>
        /// Creates or updates a subject record.
        /// Use this to add a new subject or edit an existing one.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveSubject([FromBody] MstSubjectUpsertRequest request)
        {
            try
            {
                if (request.SessionId == 0 || request.SessionId == null)
                {
                    request.SessionId = await GetSessionId();
                }
                if (request.CompanyId == 0 || request.CompanyId == null)
                {
                    request.CompanyId = await GetCompanyId();
                }
                var response = await _subjectClient.UpsertAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Toggles the active status (enable/disable) of one or more subjects.
        /// Use this to activate or deactivate subjects without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleSubjectStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _subjectClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
            
        }
        /// <summary>
        /// Deletes one or more subjects by their IDs.
        /// Use this to remove subjects that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteSubject([FromBody] List<int> ids)
        {
            try
            {
                var response = await _subjectClient.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Retrieves all sections for a given class.
        /// Use this to populate section dropdowns or filter lists based on class selection.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSectionsByClass(int id)
        {
            try
            {
                var response = await _sectionClient.GetByClassAsync(id);

                var role = User.FindFirst("UserTypeName")?.Value;
                if (role.Trim() == "Student" || role.Trim() == "Parent")
                {
                    
                    var sectionId = int.Parse(User.FindFirst("SectionID")?.Value);

                    var sectionResponse = await _sectionClient.GetByIDAsync(sectionId);

                    if (sectionResponse.Success && sectionResponse.Data != null)
                    {
                        // Replace the list inside response.Data with just this one section
                        response.Data = new List<MstSectionViewModel> { sectionResponse.Data };
                    }
                    else
                    {
                        // Student has no matching section — return empty list rather than the full unfiltered list
                        response.Data = new List<MstSectionViewModel>();
                    }
                }

                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
            
        }
        /// <summary>
        /// Retrieves all subject groups for a given class and section.
        /// Use this to filter or assign subject groups for a class-section combination.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSubjectGroups(int classId, int sectionId)
        {
            try
            {                
                int sessionId = await GetSessionId();
                int companyId = await GetCompanyId();
                var response = await _subjectGroupClient.GetAllAsync(false, sessionId, companyId);
                if (!response.Success) return Json(new { success = false, message = response.Message });

                var groups = response.Data.Where(g => g.ClassID == classId && g.SectionIds.Contains(sectionId.ToString())).ToList();
                return Json(new { success = true, data = groups });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the 'Subject Group' management page where you can group subjects together for specific classes.
        /// Use this to manage subject groups, including viewing, adding, and editing.
        /// </summary>

        // Full page load
        public async Task<IActionResult> SubjectGroup(int? pageIndex, int? pageSize,
            string? search, int? sessionId, int? companyId, int? subjectId)
        {
            var model = new MstSubjectGroupPageViewModel();
            try
            {
                model = await BuildSubjectGroupPageViewModel(
                    pageIndex, pageSize, search, sessionId, companyId, subjectId);

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
        public async Task<IActionResult> GetSubjectGroupPartial(int? pageIndex, int? pageSize,
            string? search, int? sessionId, int? companyId, int? subjectId)
        {
            try
            {
                var model = await BuildSubjectGroupPageViewModel(
                    pageIndex, pageSize, search, sessionId, companyId, subjectId);

                return PartialView("_SubjectGroupTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_SubjectGroupTablePartial", new MstSubjectGroupPageViewModel());
            }
        }

        // ✅ NEW — shared logic, extracted + corrected from the original action
        private async Task<MstSubjectGroupPageViewModel> BuildSubjectGroupPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? sessionId, int? companyId, int? subjectId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/Academics/SubjectGroup");

            sessionId = await GetSessionId();
            companyId = await GetCompanyId();

            var request = new DropdowRequest
            {
                CompanyID = await GetCompanyId(),
                SessionID = await GetSessionId()
            };

            var staffId = GetStaffID();
            if (staffId == null || staffId == 0)
            {
                staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
            }

            var requestForSubjects = new SubjectGroupSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionId ?? await GetSessionId(),
                SubjectId = subjectId
            };

            // ── Parallel fetch — dropdowns + paged subject groups ─────────────
            var groupsTask = _subjectGroupClient.GetAllSubjectGroupWithPageAsync(requestForSubjects); // ✅ CHANGED — was the non-paged GetAllAsync, so TotalRecords/PageNumber/PageSize were never populated
            var classesTask = _classClient.GetAllAsync(false, requestForSubjects.SessionID, requestForSubjects.CompanyID, staffId);
            var sectionsTask = _sectionClient.GetAllAsync(false, requestForSubjects.SessionID, requestForSubjects.CompanyID);
            var subjectsTask = _subjectClient.SubjectsDropdowBindAsync(request);

            await Task.WhenAll(groupsTask, classesTask, sectionsTask, subjectsTask);

            var pagedResult = await groupsTask;
            var classesResponse = await classesTask;
            var sectionsResponse = await sectionsTask;
            var subjectsResponse = await subjectsTask;

            var model = new MstSubjectGroupPageViewModel
            {
                SubjectGroups = pagedResult.Success ? pagedResult.Data.Data : new List<MstSubjectGroupViewModel>(), 
                TotalRecords = pagedResult.Data.TotalRecords,   
                //TotalPages = pagedResult.Data.TotalPages,       
                PageNumber = pagedResult.Data.PageNumber,      
                PageSize = pagedResult.Data.PageSize,           
                SearchTerm = search,                            
                CompanyId = companyId,                          
                SessionId = sessionId,                          
                SubjectId = subjectId,                          
                Classes = classesResponse.Success ? classesResponse.Data : new List<MstClassViewModel>(),
                Sections = sectionsResponse.Success ? sectionsResponse.Data : new List<MstSectionViewModel>(),
                Subjects = subjectsResponse.Success ? subjectsResponse.Data : new List<Dropdowbinding>()
            };
            model.Permissions = perms;

            return model;
        }


        /// <summary>
        /// Retrieves a subject group by its unique ID for editing.
        /// Use this to fetch subject group details for the edit modal or form.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSubjectGroup(int id)
        {
            try
            {
                var response = await _subjectGroupClient.GetByIDAsync(id);
                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Creates or updates a subject group record.
        /// Use this to add a new subject group or edit an existing one.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveSubjectGroup([FromBody] MstSubjectGroupUpsertRequest request)
        {
            try
            {               
                
                if(request.SessionID==0 || request.SessionID == null) 
                {
                    request.SessionID = await GetSessionId();
                }
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _subjectGroupClient.UpsertAsync(request);
                return Json(new { success = true, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Deletes one or more subject groups by their IDs.
        /// Use this to remove subject groups that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteSubjectGroup([FromBody] List<int> ids)
        {
            try
            {
                var response = await _subjectGroupClient.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        [HttpGet]
        /// <summary>
        /// Shows the page for creating or updating the school timetable.
        /// Use this to manage the timetable for all classes and subjects.
        /// </summary>
        public async Task<IActionResult> AddTimeTable()
        {
            var model = new AddTimeTablePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/ClassTimeTable"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var request = new DropdowRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = sessionId
                };
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var classes = await _classClient.GetAllAsync(false,sessionId, companyId, staffId);
                var subjectsResponse = await _subjectClient.SubjectsDropdowBindAsync(request);
                var staff = await _hrClient.GetAllStaffAsync(request.CompanyID,request.SessionID, staffId);
                var subjectGroups = await _subjectGroupClient.GetAllAsync();

                model = new AddTimeTablePageViewModel
                {
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Subjects = subjectsResponse.Success ? subjectsResponse.Data : new List<Dropdowbinding>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),
                    SubjectGroups = subjectGroups.Success ? subjectGroups.Data : new List<MstSubjectGroupViewModel>(),
                    Permissions = perms
                };

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }
        /// <summary>
        /// Loads the timetable page for a specific class, section, and subject group.
        /// Use this to display or edit the timetable for a particular class-section.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AddTimeTable(int classId, int sectionId, int subjectGroupId = 0)
        {
            var model = new AddTimeTablePageViewModel();
            try
            { 
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/ClassTimeTable"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var request = new DropdowRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = sessionId
                };

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var classes = await _classClient.GetAllAsync(false,sessionId,companyId,staffId);
                var subjectsResponse = await _subjectClient.SubjectsDropdowBindAsync(request);
                var staff = await _hrClient.GetAllStaffAsync(request.CompanyID,request.SessionID, staffId);
                var subjectGroups = await _subjectGroupClient.GetAllAsync();

                var allSubjects = subjectsResponse.Success ? subjectsResponse.Data : new List<Dropdowbinding>();
                var allSubjectGroups = subjectGroups.Success ? subjectGroups.Data : new List<MstSubjectGroupViewModel>();

                if (subjectGroupId > 0)
                {
                    var groupResponse = await _subjectGroupClient.GetByIDAsync(subjectGroupId);
                    if (groupResponse.Success && groupResponse.Data != null && groupResponse.Data.SubjectIds != null && groupResponse.Data.SubjectIds.Any())
                    {
                        allSubjects = allSubjects.Where(s => groupResponse.Data.SubjectIds.Contains(s.SubjectID.ToString())).ToList();
                    }
                }

                model = new AddTimeTablePageViewModel
                {
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Subjects = allSubjects,
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),
                    SubjectGroups = allSubjectGroups,
                    SelectedClassId = classId,
                    SelectedSectionId = sectionId,
                    SelectedSubjectGroupId = subjectGroupId,
                    Permissions = perms
                };

                if (classId > 0 && sectionId > 0)
                {
                    var slots = await _academicsClient.GetTimeTableByClassAsync(classId, sectionId,request.CompanyID,request.SessionID);
                    model.TimeTableSlots = slots.Success ? slots.Data : new List<TimeTableViewModel>();
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
        /// Shows the timetable for a specific class and section.
        /// Use this for both GET and POST requests to display the timetable.
        /// </summary>
        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> ClassTimeTable(int classId = 0, int sectionId = 0)
        {
            var model = new AddTimeTablePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/ClassTimeTable"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var classes = await _classClient.GetAllAsync(false, sessionId, companyId);
                model = new AddTimeTablePageViewModel
                {
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    SelectedClassId = classId,
                    SelectedSectionId = sectionId
                };
                var role = User.FindFirst("UserTypeName")?.Value;
                if(role.Trim() == "Student" || role.Trim() == "Parent")
                {                   
                    classId =int.Parse(User.FindFirst("ClassID")?.Value);
                    sectionId = int.Parse(User.FindFirst("SectionID")?.Value);
                    model.SelectedClassId = classId;
                    model.SelectedSectionId = sectionId;

                    var classResponse = await _classClient.GetByIDAsync(classId);

                    if (classResponse.Success && classResponse.Data != null)
                    {
                        // Wrap the single record into a list
                        model.Classes = new List<MstClassViewModel> { classResponse.Data };
                    }
                }

                if (classId > 0 && sectionId > 0)
                {
                    var slots = await _academicsClient.GetTimeTableByClassAsync(classId, sectionId,companyId,sessionId);
                    model.TimeTableSlots = slots.Success ? slots.Data : new List<TimeTableViewModel>();
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
        /// <summary>
        /// Retrieves the timetable data for a specific class and section as JSON.
        /// Use this for AJAX requests to load timetable slots.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTimeTable(int classId, int sectionId)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var response = await _academicsClient.GetTimeTableByClassAsync(classId, sectionId, companyId, sessionId);
                return Json(new { success = response.Success, data = response.Data, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Creates or updates a timetable slot.
        /// Use this to add or edit periods in the timetable.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveTimeTable([FromBody] BulkTimeTableUpsertRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Data))
            {
                return Json(new { success = false, message = "Invalid time table data received." });
            }

            try
            {
                request.SessionID = await GetSessionId();
                request.CompanyID = await GetCompanyId();
                var response = await _academicsClient.UpsertBulkTimeTableAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Deletes a timetable slot by its ID.
        /// Use this to remove a period from the timetable.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteTimeTable(int id)
        {
            try
            {
                var response = await _academicsClient.DeleteTimeTableSlotAsync(id);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
          
        }

        /// <summary>
        /// Shows the teacher timetable page, allowing teachers to view their assigned periods.
        /// Use this to display the timetable for the logged-in or selected teacher.
        /// </summary>
        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> TeacherTimeTable(int? staffId)
        {
            var model = new TeacherTimeTablePageViewModel();
            try
            {
                var perms = await GetPermissions("/Academics/TeacherTimeTable");
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                // ── Resolve which staff member's timetable to show ─────────────
                // 1. Explicit staffId (filter submit, or querystring on a GET) wins.
                // 2. Otherwise, if the logged-in user IS a staff member (teacher),
                //    default to their own timetable — this preserves the old GET behavior.
                // 3. Otherwise (super admin / non-staff account) → leave unset (0),
                //    so the view shows "Select a Teacher" instead of guessing.
                int effectiveStaffId = staffId ?? 0;               
                if (effectiveStaffId <= 0)
                {
                    var loggedInStaffId = GetStaffID();
                    effectiveStaffId = (loggedInStaffId ?? 0) > 0 ? loggedInStaffId.Value : 0;
                }

                // ⚠️ NOTE: your original GET passed `staffId` as the 3rd arg to
                // GetAllStaffAsync(companyId, sessionId, staffId) — if that arg scopes
                // the RETURNED LIST (e.g. "only staff visible to this staffId's branch"),
                // passing effectiveStaffId here is fine and intentional.
                // If instead it's meant to filter the dropdown down to just one staff
                // record, that would break the super-admin case (dropdown needs the
                // FULL staff list so they can pick anyone). Confirm which one it does —
                // I'm assuming the former (scoping) below, matching your original GET call.
                var staff = await _hrClient.GetAllStaffAsync(companyId, sessionId, effectiveStaffId > 0 ? effectiveStaffId : (int?)null);

                model = new TeacherTimeTablePageViewModel
                {
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>(),
                    SelectedStaffId = effectiveStaffId
                };

                if (effectiveStaffId > 0)
                {
                    var req = new TimeTableSearchRequest
                    {
                        CompanyID = companyId,
                        SessionID = sessionId,
                        StaffID = effectiveStaffId
                    };
                    var slots = await _academicsClient.GetTimeTableByStaffAsync(req);
                    model.TimeTableSlots = slots.Success ? slots.Data : new List<TimeTableViewModel>();
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
        /// <summary>
        /// Shows the page for assigning class teachers to classes and sections.
        /// Use this to manage which staff are assigned as class teachers.
        /// </summary>
        // Full page load
        public async Task<IActionResult> AssignClassTeacher(int? pageIndex, int? pageSize,
            string? search, int? companyId, int? sessionID, string? sectionId, string? classId)
        {
            var model = new AssignClassTeacherPageViewModel();
            try
            {
                model = await BuildAssignClassTeacherPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, sectionId, classId);

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
        public async Task<IActionResult> GetAssignClassTeacherPartial(int? pageIndex, int? pageSize,
            string? search, int? companyId, int? sessionID, string? sectionId, string? classId)
        {
            try
            {
                var model = await BuildAssignClassTeacherPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, sectionId, classId);

                return PartialView("_AssignClassTeacherTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AssignClassTeacherTablePartial", new AssignClassTeacherPageViewModel());
            }
        }

        // ✅ NEW — shared logic, extracted + corrected from the original action
        private async Task<AssignClassTeacherPageViewModel> BuildAssignClassTeacherPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID,
            string? sectionId, string? classId)
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions("/Academics/AssignClassTeacher");

            var sessionId = await GetSessionId();
            companyId = companyId ?? await GetCompanyId();

            var staffId = GetStaffID();
            if (staffId == null || staffId == 0)
            {
                staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
            }

            var request = new AcademicsSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? await GetSessionId(),
                SectionID = sectionId ?? null,
                ClassIDs = classId ?? null
            };

            // ── Parallel fetch — dropdowns + paged assignments ────────────────
            var assignmentsTask = _academicsClient.GetAllClassWithPageAsync(request); // ✅ paged call, gives TotalRecords/PageNumber/PageSize
            var classesTask = _classClient.GetAllAsync(false, request.SessionID, request.CompanyID, staffId); // ✅ CHANGED — staffId now passed, matches SubjectGroup pattern
            var staffTask = _hrClient.GetAllStaffAsync(request.CompanyID, request.SessionID, staffId);
            var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();

            await Task.WhenAll(assignmentsTask, classesTask, staffTask, sessionTask, companiesTask);

            var pagedResult = await assignmentsTask;
            var classesResponse = await classesTask;
            var staffResponse = await staffTask;
            var sessionResponse = await sessionTask;
            var companiesResponse = await companiesTask;

            var model = new AssignClassTeacherPageViewModel
            {
                Assignments = pagedResult.Success ? pagedResult.Data.Data : new List<ClassTeacherViewModel>(),
                TotalRecords = pagedResult.Data.TotalRecords,
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                CompanyId = request.CompanyID,
                SessionId = request.SessionID,
                Classes = classesResponse.Success ? classesResponse.Data : new List<MstClassViewModel>(),
                Staff = staffResponse.Success ? staffResponse.Data : new List<HRStaffViewModel>(),
                Companies = companiesResponse.Data ?? new(),
                Sessions = sessionResponse.Data ?? new()
            };
            model.Permissions = perms;

            return model;
        }
        /// <summary>
        /// Creates or updates a class teacher assignment.
        /// Use this to assign or update staff as class teachers for classes/sections.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveClassTeacher([FromBody] ClassTeacherUpsertRequest request)
        {
            try
            {
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();

                var response = await _academicsClient.UpsertClassTeacherAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Deletes one or more class teacher assignments by their IDs.
        /// Use this to remove class teacher assignments.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteClassTeacher(List<int> id)
        {
            try
            {
                var response = await _academicsClient.DeleteClassTeacherAsync(id);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Deletes class teacher assignments for specific class and section combinations.
        /// Use this to bulk remove assignments for selected classes and sections.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteClassTeacherByClassSection(List<int> classId, List<int> sectionId)
        {
            try
            {
                var assignmentsResponse = await _academicsClient.GetAllClassTeachersAsync(classId, sectionId);
                if (assignmentsResponse.Success)
                {
                    List<int> classTeacherIds = new List<int>();

                    foreach (var item in assignmentsResponse.Data)
                    {
                        classTeacherIds.Add(item.ClassTeacherID);
                    }
                    var resp=await _academicsClient.DeleteClassTeacherAsync(classTeacherIds);
                    return Json(new { success = resp.Success, message = resp.Message ?? "Failed to load assignments." });
                }
                else 
                {
                    return Json(new { success = false, message ="Failed to load assignments." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
            
        }


        /// <summary>
        /// Shows the student promotion page, allowing you to promote students from one class/section to another.
        /// Use this to manage student promotions at the end of the academic year.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> PromoteStudents(int? classId, int? sectionId, int? pageIndex,
    int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new PromoteStudentsPageViewModel();
            try
            {
                model = await BuildPromoteStudentsPageViewModel(
                    classId, sectionId, pageIndex, pageSize, search, companyId, sessionID);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ NEW — AJAX endpoint, returns only the table partial
        [HttpGet]
        public async Task<IActionResult> GetPromoteStudentsPartial(int? classId, int? sectionId,
            int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildPromoteStudentsPageViewModel(
                    classId, sectionId, pageIndex, pageSize, search, companyId, sessionID);
                return PartialView("_PromoteStudentsTable", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PromoteStudentsTable", new PromoteStudentsPageViewModel());
            }
        }

        // ✅ shared logic extracted from the original action, unchanged internally
        private async Task<PromoteStudentsPageViewModel> BuildPromoteStudentsPageViewModel(
            int? classId, int? sectionId, int? pageIndex, int? pageSize,
            string? search, int? companyId, int? sessionID)
        {
            var perms = await GetPermissions("/Academics/PromoteStudents");

            var reqModel = new SearchPromotedStudent
            {
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? await GetSessionId(),
                ClassID = classId,
                SectionID = sectionId,
                SearchKeyword = search,
                PageNumber = pageIndex,
                PageSize = pageSize
            };

            var staffId = GetStaffID();
            staffId = (staffId ?? 0) <= 0 ? null : staffId;

            // ── Parallel fetch — dropdowns + paged students ─────────────────
            var classesTask = _classClient.GetAllAsync(false, reqModel.SessionID, reqModel.CompanyID, staffId);
            var sessionsTask = _sessionClient.GetAllAsync(false, reqModel.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(classesTask, sessionsTask, companiesTask);

            var model = new PromoteStudentsPageViewModel
            {
                Classes = (await classesTask).Success ? (await classesTask).Data : new List<MstClassViewModel>(),
                Sessions = (await sessionsTask).Data ?? new List<MstSessionViewModel>(),
                Companies = (await companiesTask).Data ?? new List<MstCompanyViewModel>(),
                SelectedClassId = classId,
                SelectedSectionId = sectionId,
                CompanyId = reqModel.CompanyID,
                SessionId = reqModel.SessionID,
                SearchTerm = search
            };

            if (classId.HasValue && sectionId.HasValue)
            {
                var students = await _academicsClient.GetForPromotionPageIndexAsync(reqModel);
                if (students.Success) model.Students = students.Data.Data;
                model.PageNumber = students.Data.PageNumber;
                model.PageSize = students.Data.PageSize;
            }

            model.Permissions = perms;
            return model;
        }

        /// <summary>
        /// Promotes students to the next class or section.
        /// Use this to finalize and save student promotions.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SavePromotion([FromBody] PromotionRequest request)
        {
            try
            {
                var response = await _academicsClient.PromoteStudentsAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Toggles the active status (enable/disable) of one or more subject groups.
        /// Use this to activate or deactivate subject groups without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleSubjectGroupStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _subjectGroupClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Shows the add/edit form for a class.
        /// Use this to display the UI for creating or editing a class.
        /// </summary>
        public async Task<IActionResult> AddClass(int? id)
        {
            var model = new MstClassAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/Class"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var sectionsResponse = await _sectionClient.GetAllAsync(false, sessionId, companyId);
                model = new MstClassAddViewModel
                {
                    AvailableSections = sectionsResponse.Success ? sectionsResponse.Data : new List<MstSectionViewModel>()
                };


                if (id.HasValue && id.Value > 0)
                {
                    var response = await _classClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Classes = response.Data;
                        model.EditClasses = response.Data;
                    }
                }
                else
                {
                    model.EditClasses = null;
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

        /// <summary>
        /// Shows the add/edit form for a subject.
        /// Use this to display the UI for creating or editing a subject.
        /// </summary>
        public async Task<IActionResult> AddSubject(int? id)
        {
            var model = new MstSubjectAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var sectionsResponse = await _sectionClient.GetAllAsync(false, sessionId);
                var subjectType = await _subjectTypeService.GetSubjectsTypeDropdownListAsync(await GetCompanyId(),sessionId);
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _subjectClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Subjects = response.Data;
                        model.EditSubjects = response.Data;
                    }
                }
                else
                {
                    model.EditSubjects = null;
                }
                model.SubjectType = subjectType.Data;
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
        /// Shows the add/edit form for a subject group.
        /// Use this to display the UI for creating or editing a subject group.
        /// </summary>
        public async Task<IActionResult> AddSubjectGroup(int? id)
        {
            var model = new MstSubjectGroupAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/SubjectGroup"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                var request = new DropdowRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = sessionId
                };

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var classesResponse = await _classClient.GetAllAsync(false, sessionId,companyId, staffId);
                var sectionsResponse = await _sectionClient.GetAllAsync(false, sessionId);
                var subjectsResponse = await _subjectClient.SubjectsDropdowBindAsync(request);
                model = new MstSubjectGroupAddViewModel
                {                    
                    Classes = classesResponse.Success ? classesResponse.Data : new List<MstClassViewModel>(),
                    Sections = sectionsResponse.Success ? sectionsResponse.Data : new List<MstSectionViewModel>(),
                    Subjects = subjectsResponse.Success ? subjectsResponse.Data : new List<Dropdowbinding>()
                };

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _subjectGroupClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.SubjectGroups = response.Data;
                        model.EditSubjectGroups = response.Data;
                    }
                }
                else
                {
                    model.EditSubjectGroups = null;
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

        /// <summary>
        /// Shows the add/edit form for assigning a class teacher.
        /// Use this to display the UI for assigning or editing class teacher assignments.
        /// </summary>
        public async Task<IActionResult> AddAssignClassTeacher(int? id, int? sectionId, string staffIds = null)
        {
            var model = new AssignClassTeacherAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Academics/Class"
               );
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var sectionsResponse = await _sectionClient.GetAllAsync(false, sessionId,companyId);
                var classes = await _classClient.GetAllAsync(false, sessionId,companyId,staffId);
                var staff = await _hrClient.GetAllStaffAsync(companyId,sessionId, staffId);
                model = new AssignClassTeacherAddViewModel
                {
                    Classes = classes.Success ? classes.Data : new List<MstClassViewModel>(),
                    Staff = staff.Success ? staff.Data : new List<HRStaffViewModel>()
                };


                if (id.HasValue && id.Value > 0)
                {
                    var response = await _sectionClient.GetByClassAsync(id.Value);
                    if (response.Success)
                    {
                        //model.Assignments = response.Data;
                        model.EditAssignments = true;
                    }
                }
                else
                {
                    model.EditAssignments = false;
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
        /// <summary>
        /// Toggles the active status (enable/disable) of one or more academics class teache.
        /// Use this to activate or deactivate academics class teache without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleAcademicsClassTeacherStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _academicsClient.ToggleAcademicsClassTeacherStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }


        /// <summary>
        /// Shows the student promotion page, allowing you to promote students from one class/section to another.
        /// Use this to manage student promotions at the end of the academic year.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> DemotionStudents(int? classId, int? sectionId, int? pageIndex,
    int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new DemotionStudentsPageViewModel();
            try
            {
                model = await BuildDemotionStudentsPageViewModel(
                    classId, sectionId, pageIndex, pageSize, search, companyId, sessionID);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ NEW — AJAX endpoint, returns only the table partial
        [HttpGet]
        public async Task<IActionResult> GetDemotionStudentsPartial(int? classId, int? sectionId,
            int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildDemotionStudentsPageViewModel(
                    classId, sectionId, pageIndex, pageSize, search, companyId, sessionID);
                return PartialView("_DemotionStudentsTable", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_DemotionStudentsTable", new DemotionStudentsPageViewModel());
            }
        }

        // ✅ shared logic extracted from the original action, unchanged internally
        private async Task<DemotionStudentsPageViewModel> BuildDemotionStudentsPageViewModel(
            int? classId, int? sectionId, int? pageIndex, int? pageSize,
            string? search, int? companyId, int? sessionID)
        {
            var perms = await GetPermissions("/Academics/PromoteStudents");

            var reqModel = new SearchPromotedStudent
            {
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? await GetSessionId(),
                ClassID = classId,
                SectionID = sectionId,
                SearchKeyword = search,
                PageNumber = pageIndex,
                PageSize = pageSize
            };

            var staffId = GetStaffID();
            staffId = (staffId ?? 0) <= 0 ? null : staffId;

            // ── Parallel fetch — dropdowns + paged students ─────────────────
            var classesTask = _classClient.GetAllAsync(false, reqModel.SessionID, reqModel.CompanyID, staffId);
            var sessionsTask = _sessionClient.GetAllAsync(false, reqModel.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(classesTask, sessionsTask, companiesTask);

            var model = new DemotionStudentsPageViewModel
            {
                Classes = (await classesTask).Success ? (await classesTask).Data : new List<MstClassViewModel>(),
                Sessions = (await sessionsTask).Data ?? new List<MstSessionViewModel>(),
                Companies = (await companiesTask).Data ?? new List<MstCompanyViewModel>(),
                SelectedClassId = classId,
                SelectedSectionId = sectionId,
                CompanyId = reqModel.CompanyID,
                SessionId = reqModel.SessionID,
                SearchTerm = search
            };

            if (classId.HasValue && sectionId.HasValue)
            {
                var students = await _academicsClient.GetForDemotionPageIndexAsync(reqModel);
                if (students.Success) model.Students = students.Data.Data;
                model.PageNumber = students.Data.PageNumber;
                model.PageSize = students.Data.PageSize;
            }

            model.Permissions = perms;
            return model;
        }

        /// <summary>
        /// Promotes students to the next class or section.
        /// Use this to finalize and save student promotions.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveDemoteStudents([FromBody] DemotionRequest request)
        {
            try
            {
                var response = await _academicsClient.DemoteStudentsAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
