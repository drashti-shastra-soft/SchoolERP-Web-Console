using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages all the web pages related to student information.
    /// It handles pages for student admission, viewing student lists, student categories, 
    /// houses, and other student-specific settings.
    /// Think of this as the manager who decides which page to show when you click on student-related menus.
    /// </summary>
    public class StudentInformationController :   BaseController
    {
        private readonly IStudentInformationClientService _studentService;
        private readonly ICompanyClientService _companyService;
        private readonly IFieldClientService _fieldService;
        private readonly ISessionClientService _sessionService;
        private readonly IRouteClientService _routeService;
        private readonly IRoutePickupPointClientService _routePickupPointService;
        private readonly IHostelClientService _hostelService;
        private readonly IClassClientService _classService;
        private readonly ISectionClientService _sectionService;
        private readonly IVehicleAssignClientService _vehicleAssignService;
        private readonly IAttendanceClientService _attendanceService;
        private readonly IPhotoUploadService _photoService;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ICountryClientService _countryService;
        //private readonly PermissionHelper _permHelper;
        private readonly IFeeTemplateClientService _feeTemplateService;
        public StudentInformationController(IStudentInformationClientService studentService,
            ICompanyClientService companyService, ISessionClientService sessionService, 
            IFieldClientService fieldService, IRouteClientService routeService, 
            IRoutePickupPointClientService routePickupPointService,
            IHostelClientService hostelService, IClassClientService classService,
            ISectionClientService sectionService, IVehicleAssignClientService vehicleAssignService, 
            IAttendanceClientService attendanceService, IPhotoUploadService photoService,
            PermissionHelper permHelper, IConfiguration configuration, ICountryClientService countryClient,
            IWebHostEnvironment environment, IFeeTemplateClientService feeTemplateService) : base(permHelper)
        {
            _studentService = studentService;
            _companyService = companyService;
            _sessionService = sessionService;
            _fieldService = fieldService;
            _routeService = routeService;
            _routePickupPointService = routePickupPointService;
            _hostelService = hostelService;
            _classService = classService;
            _sectionService = sectionService;
            _vehicleAssignService = vehicleAssignService;
            _attendanceService = attendanceService;
            _photoService = photoService;
            _configuration = configuration;
            _environment = environment;
            _feeTemplateService = feeTemplateService;
            _countryService = countryClient;
        }

        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        private int GetUserId() => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value, out var id) ? id : 0;
        private async Task<int> GetCompanyId()
        {
            if(CurrentCompanyId == null || CurrentCompanyId == 0)  
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private async Task<int> GetSessionId()
        {
            if(CurrentSessionId == null || CurrentSessionId==0) 
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }

        /// <summary>
        /// Shows the page where the school can manage reasons for disabling students (e.g., 'Transfer Certificate issued').
        /// Use this to add, edit, or view reasons for disabling student records.
        /// </summary>
        
        public async Task<StudentDisableReasonPageViewModel> BuildDisableReasonPageViewModel(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new StudentDisableReasonPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/StudentInformation/DisableReason"
               );
                var request = new StudentCategorySearch
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };
                //var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _studentService.GetAllDisableReasonsWithPageAsync(request);

                var sessionTask = await _sessionService.GetAllAsync(false,request.CompanyID);
                var companiesTask = await _companyService.GetAllAsync();
                model = new StudentDisableReasonPageViewModel
                {
                    Items = response.Success ? response.Data.Data : new List<StudentDisableReasonViewModel>(),
                    TotalRecords = response.Data.TotalRecords,
                    PageNumber = response.Data.PageNumber,
                    PageSize = response.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    Companies = companiesTask.Data ?? new(),
                    Sessions = sessionTask.Data ?? new(),
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

        public async Task<IActionResult> DisableReason(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new StudentDisableReasonPageViewModel();
            try
            {
                model = await BuildDisableReasonPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetDisableReasonPartial(int? pageIndex, int? pageSize, string? search,int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildDisableReasonPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_DisableReasonTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_DisableReasonTablePartial", new StudentDisableReasonPageViewModel());
            }
        }


        /// <summary>
        /// Shows the page for managing student houses (e.g., Red House, Blue House).
        /// Use this to add, edit, or view student house assignments.
        /// </summary>

        public async Task<StudentHousePageViewModel> BuildStudentHousePageViewModel(int? pageIndex, int? pageSize,string? search,int? companyId,
        int? sessionID)
        {
            var model = new StudentHousePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/StudentHouse"
                );

                var request = new SubjectSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };
                var studentHouseTask = _studentService.GetStudentHouseListAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(studentHouseTask, sessionTask, companiesTask);
                var pagedResult = await studentHouseTask;
                model = new StudentHousePageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<StudentHouseViewModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
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

        public async Task<IActionResult> StudentHouse(int? pageIndex, int? pageSize,string? search,int? companyId,int? sessionID)
        {
            var model = new StudentHousePageViewModel();
            try
            {
                model = await BuildStudentHousePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetStudentHousePartial(int? pageIndex,int? pageSize,string? search,int? companyId,int? sessionID)
        {
            try
            {
                var model = await BuildStudentHousePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_StudentHouseTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StudentHouseTablePartial", new StudentHousePageViewModel());
            }
        }



        /// <summary>
        /// Shows the page for managing student categories (e.g., General, OBC).
        /// Use this to add, edit, or view student categories.
        /// </summary>
        public async Task<IActionResult> StudentCategory(int? pageIndex,int? pageSize, string? search,int? companyId, int? sessionID)
        {
            var model = new StudentCategoryPageViewModel();
            try
            {
                model = await BuildStudentCategoryPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetStudentCategoryPartial(int? pageIndex,int? pageSize,string? search,int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildStudentCategoryPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_StudentCategoryTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StudentCategoryTablePartial", new StudentCategoryPageViewModel());
            }
        }

        public async Task<StudentCategoryPageViewModel> BuildStudentCategoryPageViewModel(int? pageIndex,int? pageSize,string? search,int? companyId, int? sessionID)
        {
            var model = new StudentCategoryPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/FrontOffice/Setup"
               );

                var request = new StudentCategorySearch
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };


                var sessionId = await GetSessionId();
                var studentCategories = _studentService.GetAllStudentCategoriesWithPageAsync(request);
                
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(studentCategories, sessionTask, companiesTask);

                var pagedResult = await studentCategories;

                model = new StudentCategoryPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<StudentCategoryViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;
                // Step 3: Open the 'Setup' page for the user.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }


        /// <summary>
        /// Shows the main Student Admission form. 
        /// If an 'id' is provided, it opens the form in 'Edit' mode for that specific student.
        /// Prepares all dropdown lists needed for the form, like classes, houses, and hostels.
        /// </summary>
        public async Task<IActionResult> StudentAdmission(int? id)
        {

            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }

                var country = await _countryService.GetAllAsync(companyId, sessionId);
                ViewBag.Countries = country?.Data ?? new List<CountryModel>();
                // Fetch all fields to ensure Transport, Hostel, and Guardian categories are included
                var fields = await _fieldService.GetAllFieldsAsync(companyId, sessionId, belongsTo: "students");

                if (id.HasValue && id > 0)
                {
                    var studentDetails = await _studentService.GetStudentByIDAsync(id.Value,companyId,sessionId);
                    if (studentDetails.Data.BasicInfo.StudentID > 0)
                    {
                        ViewBag.StudentDetails = studentDetails.Data;
                        ViewBag.IsEdit = true;
                    }
                }



                // Fetch lookup data for dropdowns
                ViewBag.Categories = (await _studentService.GetAllStudentCategories(sessionId, companyId,true)).Data;
                ViewBag.Houses = (await _studentService.GetAllStudentHouses(sessionId, companyId,true)).Data;
                ViewBag.Routes = (await _routeService.GetAllRoutesAsync(companyId, sessionId)).Data;
                ViewBag.PickupPoints = (await _routePickupPointService.GetAllRoutePickupPointsAsync(companyId, sessionId)).Data;
                ViewBag.Hostels = (await _hostelService.GetAllHostelsAsync(true, sessionId, companyId)).Data;
                var res = await _vehicleAssignService.GetAllAssignmentsAsync(companyId, sessionId);
                ViewBag.VehicleAssignments = res.Data;
                ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId, companyId, staffId)).Data;


                // Check if Roll No is Auto Generated
                var autoGenSettings = await _fieldService.GetIDAutoGenSettingsAsync(companyId, sessionId);
                var studentSettings = autoGenSettings.Data.FirstOrDefault(s => s.EntityType == "Student" && s.IsEnabled);
                bool isRollAutoGenerated = studentSettings != null;
                ViewBag.IsRollAutoGenerated = isRollAutoGenerated;
                if (isRollAutoGenerated)
                {
                    ViewBag.RollNoDependencies = studentSettings.FieldsToInclude;
                    if (!(ViewBag.IsEdit ?? false))
                    {
                        var roleModel = new StudentRollNoRequest
                        {
                            SessionId = sessionId,
                            CompanyID=companyId
                        };
                        ViewBag.NextRollNo = (await _studentService.GetNewStudentRollNo(roleModel)).Data;
                    }
                }

                return View(fields.Data);
            }
            catch (Exception ex)
            {
                var model = new List<FieldModel>();
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }

        /// <summary>
        /// Returns a filtered list of students for dropdowns or AJAX grids.
        /// Use this to search students by class, section, or name, and optionally exclude a student.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentList(int? classId, int? sectionId, string? searchTerm, int? excludeStudentId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _studentService.GetStudentAllListAsync(companyId, sessionId, classId, sectionId);
                var students = new List<StudentListViewModel>();
                if (response.Success != false && response.Data != null)
                {
                    students = response.Data ?? new List<StudentListViewModel>();
                }
                if (excludeStudentId.HasValue)
                {
                    students = students.Where(s => s.StudentID != excludeStudentId.Value).ToList();
                }

                var result = students.Select(s => new {
                    studentID = s.StudentID,
                    fullName = s.FullName,
                    admissionNo = s.AdmissionNo,
                    rollNo = s.RollNo
                }).ToList();
                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the list of all students. 
        /// Users can filter the list by class, section, or search for a specific name/roll number.
        /// </summary>
        [HttpGet]
        /// <summary>
        /// Shows the list of all students. 
        /// Users can filter the list by class, section, or search for a specific name/roll number.
        /// </summary>
       
        public async Task<StudentListPageViewModel> BuildStudentListPageViewModel(int? classId, int? sectionId, string? search,
            string? viewType, int page, int pageSize)
        {
            var model = new StudentListPageViewModel();
            try
            {
                // ── Permissions ──────────────────────────────────────────────
                var perms = await GetPermissions(
                    "/StudentInformation/Students",
                    "/StudentInformation/ImportStudent"
                );

                // ── Redirect if no view permission ───────────────────────────
                if (!perms.CanView)
                {
                    TempData["Error"] = "You do not have permission to view students.";
                    return model;
                }


                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var allFieldsresponse = await _fieldService.GetAllFieldsAsync(companyId, sessionId, belongsTo: "students");
                List<FieldModel> allFields = new List<FieldModel>();
                if (allFieldsresponse.Success)
                {
                    allFields = allFieldsresponse.Data;
                }
                var role = User.FindFirst("UserTypeName")?.Value;
                int? studentId = null;
                if (role.Trim() == "Student")
                {
                    studentId = int.Parse(User.FindFirst("StudentID")?.Value);
                }
                var response = await _studentService.GetStudentListAsync(companyId, sessionId, classId, sectionId, search, page, pageSize, studentId);

                model.Students = response.Data.Data;
                model.TotalRecords = response.Data.TotalRecords;
                model.PageNumber = response.Data.PageNumber;
                model.PageSize = response.Data.PageSize;
                model.SelectedClassId = classId;
                model.SelectedSectionId = sectionId;
                model.SearchTerm = search;
                model.ViewType = viewType ?? "list";
                model.SystemFields = allFields.Where(f => f.IsSystemField).ToList();
                model.CustomFields = allFields.Where(f => !f.IsSystemField).ToList();
                model.Permissions = perms;

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }



                ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId, companyId, staffId)).Data;
                if (classId.HasValue)
                {
                    ViewBag.Sections = (await _sectionService.GetByClassAsync(classId.Value)).Data;
                }
                else
                {
                    ViewBag.Sections = new List<MstSectionViewModel>();
                }

                int currentUserId = Convert.ToInt32(User.FindFirstValue(ClaimTypes.NameIdentifier));

                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> Students(int? classId, int? sectionId, string? search,string? viewType, int page, int pageSize)
        {
            var model = new StudentListPageViewModel();
            try
            {
                model = await BuildStudentListPageViewModel(classId, sectionId, search, viewType, page, pageSize);

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
        public async Task<IActionResult> GetStudentListTypePartial(int? classId, int? sectionId, string? search, string? viewType, int page, int pageSize)
        {
            try
            {
                var model = await BuildStudentListPageViewModel(classId, sectionId, search, viewType, page, pageSize);

                return PartialView("_StudentListTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StudentListTablePartial", new StudentListPageViewModel());
            }
        }



        public async Task<IActionResult> BulkMail(int? classId, int? sectionId, string? search, string? viewType, int page,int pageSize)
        {
            var model = new StudentListPageViewModel();
            try
            {
                model = await BuildStudentListPageViewModel(classId, sectionId, search, viewType, page, pageSize);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetBulkMailPartial(int? classId, int? sectionId, string? search, string? viewType, int page, int pageSize)
        {
            try
            {
                var model = await BuildStudentListPageViewModel(classId, sectionId, search, viewType, page, pageSize);

                return PartialView("_BulkMailTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_BulkMailTablePartial", new StudentListPageViewModel());
            }
        }


        /// <summary>
        /// Shows the detailed profile page of a specific student.
        /// Use this to view all information about a student.
        /// </summary>
        [Route("StudentInformation/Details/{id}")]
        /// <summary>
        /// Shows the detailed profile page of a specific student.
        /// </summary>
        public async Task<IActionResult> Details(int id)
        {
            var model = new ApiResponse<StudentDetailsViewModel>();
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                model = await _studentService.GetStudentByIDAsync(id,companyId,sessionId);
                if (model.Data.BasicInfo.StudentID == 0)
                {
                    return Content($"Student record with ID {id} was not found for the current Company/Session.");
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
        /// Returns student details as JSON for AJAX requests.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentDetails(int id)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                //var model = _studentService.GetStudentDetails(id);
                var model =await _studentService.GetStudentByIDAsync(id, companyId, sessionId);
                return Json(model.Data);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
          
        }
        /// <summary>
        /// Returns the next available roll number for a student, based on auto-generation settings.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNextRollNo()
        {
            try
            {
                var query = Request.Query;
                var values = new Dictionary<string, string>();
                foreach (var key in query.Keys)
                {
                    values[key] = query[key]!;
                }
                var roleModel = new StudentRollNoRequest
                {
                    SessionId = await GetSessionId()
                };
                var response = await _studentService.GetNewStudentRollNo(roleModel);
                string rollNo = string.Empty;
                if (response.Success)
                {
                    rollNo = response.Data;
                }
                return Json(new { rollNo });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Returns the next available admission number for a student.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNextAdmissionNo()
        {
            try
            {
                string admissionNo = string.Empty;
                var response = await _studentService.GetNextAdmissionNo();

                if (response.Success)
                {
                    admissionNo = response.Data;
                }
                return Json(new { admissionNo });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Saves or updates a student admission record, including profile photo and documents.
        /// Use this when submitting the admission form.
        /// </summary>
        [HttpPost]
        /// <summary>
        /// This action is called when the 'Save' button is clicked on the Admission form.
        /// It takes all the student data and sends it to the service to be saved in the database.
        /// </summary>
        public async Task<IActionResult> SaveStudent([FromBody] StudentAdmissionUpsertRequest req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                req.SessionId = await GetSessionId();
                var res = await _studentService.UpsertStudentAdmission(req);
                req.FieldValues.TryGetValue("Student Photo", out var photoBase64);
                req.FieldValues.TryGetValue("Student Photo Name", out var photoName);

                req.FieldValues.TryGetValue("Mother Photo", out var photoMotherPhotoBase64);
                req.FieldValues.TryGetValue("Student Photo Name", out var motherPhotoType);

                req.FieldValues.TryGetValue("Father Photo", out var photoFatherPhotoBase64);
                req.FieldValues.TryGetValue("Father Photo Name", out var fatherPhotoType);

                req.FieldValues.TryGetValue("Guardian Photo", out var photoGuardianPhotoBase64);
                req.FieldValues.TryGetValue("Guardian Photo Name", out var guardianPhotoType);
                if (res.Success)
                {
                    int studentid = res.Data;
                    PhotoUploadResult photoResult = new PhotoUploadResult();
                    if (photoBase64 != null && photoBase64 != "")
                    {
                        photoResult = await _photoService.SaveBase64PhotoAsync(
                            photoBase64,
                            photoName ?? "photo.jpg",
                            PhotoModule.Student,
                            FolderNameModule.Profile,
                            studentid
                        );
                    }

                    PhotoUploadResult photoFatherResult = new PhotoUploadResult();
                    if (photoFatherPhotoBase64 != null && photoFatherPhotoBase64 != "")
                    {
                        photoFatherResult = await _photoService.SaveBase64PhotoAsync(
                            photoFatherPhotoBase64,
                            fatherPhotoType ?? "photo.jpg",
                            PhotoModule.Parent,
                            FolderNameModule.Profile,
                            studentid
                        );
                    }
                    PhotoUploadResult photoMotherResult = new PhotoUploadResult();
                    if (photoMotherPhotoBase64 != null && photoMotherPhotoBase64 != "")
                    {
                        photoMotherResult = await _photoService.SaveBase64PhotoAsync(
                            photoMotherPhotoBase64,
                            motherPhotoType ?? "photo.jpg",
                            PhotoModule.Parent,
                            FolderNameModule.Profile,
                            studentid
                    );
                    }

                    PhotoUploadResult photoGuardianResult = new PhotoUploadResult();
                    if (photoMotherPhotoBase64 != null && photoMotherPhotoBase64 != "")
                    {
                        photoGuardianResult = await _photoService.SaveBase64PhotoAsync(
                            photoGuardianPhotoBase64,
                            guardianPhotoType ?? "photo.jpg",
                            PhotoModule.Parent,
                            FolderNameModule.Profile,
                            studentid
                        );
                    }


                    if (photoResult.Success)
                    {
                        var model = new ProfileRequest();
                        model.Id = studentid;
                        model.PhotoDoc = photoResult.PhotoUrl;
                        model.MotherPhoto = photoMotherResult.PhotoUrl;
                        model.FatherPhoto = photoFatherResult.PhotoUrl;
                        model.GuardianPhoto = photoGuardianResult.PhotoUrl;
                        await _studentService.UpdateStudentProfileAsync(model);
                    }

                    // ── NEW: handle multiple document uploads (Document 1-4) ──
                    var documentsToSave = new List<StudentDocumentSaveModel>();

                    for (int i = 1; i <= 4; i++)
                    {
                        req.FieldValues.TryGetValue($"DocumentTitle_{i}", out var docTitle);
                        req.FieldValues.TryGetValue($"DocumentFile_{i}", out var docBase64);
                        req.FieldValues.TryGetValue($"DocumentFile_{i} Name", out var docFileName);
                        string? extension = null;

                        if (!string.IsNullOrWhiteSpace(docFileName))
                        {
                            extension = Path.GetExtension(docFileName); // e.g. ".pdf", ".jpg", ".png"
                        }
                        if (string.IsNullOrEmpty(docBase64) || string.IsNullOrEmpty(docTitle))
                            continue; // skip empty rows — user didn't fill this slot

                        var docResult = await _photoService.SaveBase64PhotoAsync(
                            docBase64,
                            docFileName ?? $"document_{i}",
                            PhotoModule.Document,
                            FolderNameModule.Documents, // add this enum value if it doesn't exist
                            studentid
                        );

                        if (docResult.Success)
                        {
                            documentsToSave.Add(new StudentDocumentSaveModel
                            {
                                StudentID = studentid,
                                DocumentTitle = docTitle,
                                DocumentPath = docResult.PhotoUrl, // string path only, no binary
                                DocumentType = extension ?? "",
                                DocumentContent = docResult.FileName ?? ""
                            });
                        }
                    }

                    if (documentsToSave.Any())
                    {
                        await _studentService.SaveStudentDocumentsBulkAsync(documentsToSave);
                    }
                }
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all pickup points for a given transport route.
        /// Use this to populate pickup point dropdowns.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPickupPoints(int routeId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var allLinks = await _routePickupPointService.GetAllRoutePickupPointsAsync(companyId,sessionId);
                var points = allLinks.Data.Where(l => l.RouteID == routeId && l.IsActive)
                                     .Select(l => new { id = l.PickupPointID, name = l.PickupPointName })
                                     .ToList();
                return Json(points);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all hostel rooms for a given hostel.
        /// Use this to populate hostel room dropdowns.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHostelRooms(int hostelId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var allRooms = await _hostelService.GetHostelRoomDropdownListAsync(companyId, sessionId, hostelId);
               
                return Json(allRooms);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        /// <summary>
        /// Returns all sections for a given class.
        /// Use this to populate section dropdowns.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSections(int classId)
        {
            try
            {
                var sections = await _sectionService.GetByClassAsync(classId);
                var result = sections.Data.Where(s => s.IsActive)
                                     .Select(s => new { id = s.SectionID, name = s.SectionName })
                                     .ToList();
                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        /// <summary>
        /// Deletes one or more students by their IDs.
        /// Use this to remove student records from the system.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStudent([FromBody] List<int> ids)
        {
            try
            {
                var res = await _studentService.BulkDeleteStudents(ids);
                return Json(new { success = true, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        /// <summary>
        /// Shows the page for managing students assigned to multiple classes.
        /// </summary>
        //public async Task<IActionResult> MultiClassStudents()
        //{
        //    try
        //    {
        //        var companyId = await GetCompanyId();
        //        var sessionId = await GetSessionId();
        //        var classss = await _classService.GetAllAsync(false,sessionId,companyId);
        //        return View();
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return View();
        //    }
            
        //}

        /// <summary>
        /// Shows the list of disabled students (e.g., students who have left or are inactive).
        /// Use this to filter and manage disabled student records.
        /// </summary>
        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> DisabledStudents(int? classId, int? sectionId, string? search)
        {
            var model = new StudentListPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/StudentInformation/DisabledStudents"
               );
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                model = new StudentListPageViewModel
                {
                    //Students =await _studentService.GetDisabledStudentList(classId, sectionId, search),
                    SelectedClassId = classId,
                    SelectedSectionId = sectionId,
                    SearchTerm = search
                };
                var response = await _studentService.GetDisabledStudentList(classId, sectionId, search, sessionId, companyId);

                if (response.Success)
                {
                    model.Students = response.Data ?? new List<StudentListViewModel>();
                }

                ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId, companyId, staffId)).Data;
                if (classId.HasValue)
                {
                    ViewBag.Sections = (await _sectionService.GetByClassAsync(classId.Value)).Data;
                }
                else
                {
                    ViewBag.Sections = new List<MstSectionViewModel>();
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
        /// Shows the bulk delete page for removing multiple students at once.
        /// </summary>
        public async Task<StudentListPageViewModel> BuildBulkDeleteViewModel(int? classId, int? sectionId, string? search, string? viewType, int page,
    int pageSize)
        {
            var model = new StudentListPageViewModel();
            try
            {
                // ── Permissions ──────────────────────────────────────────────
                var perms = await GetPermissions(
                    "/StudentInformation/Students",
                    "/StudentInformation/ImportStudent"
                );

                // ── Redirect if no view permission ───────────────────────────
                if (!perms.CanView)
                {
                    TempData["Error"] = "You do not have permission to view students.";
                    return model;
                }


                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var allFieldsresponse = await _fieldService.GetAllFieldsAsync(companyId, sessionId, belongsTo: "students");
                List<FieldModel> allFields = new List<FieldModel>();
                if (allFieldsresponse.Success)
                {
                    allFields = allFieldsresponse.Data;
                }
                var response = await _studentService.GetStudentListAsync(companyId, sessionId, classId, sectionId, search, page, pageSize);

                model.Students = response.Data.Data;
                model.TotalRecords = response.Data.TotalRecords;
                model.PageNumber = response.Data.PageNumber;
                model.PageSize = response.Data.PageSize;
                model.SelectedClassId = classId;
                model.SelectedSectionId = sectionId;
                model.SearchTerm = search;
                model.ViewType = viewType ?? "list";
                model.SystemFields = allFields.Where(f => f.IsSystemField).ToList();
                model.CustomFields = allFields.Where(f => !f.IsSystemField).ToList();
                model.Permissions = perms;

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId, companyId, staffId)).Data;
                if (classId.HasValue)
                {
                    ViewBag.Sections = (await _sectionService.GetByClassAsync(classId.Value)).Data;
                }
                else
                {
                    ViewBag.Sections = new List<MstSectionViewModel>();
                }

                int currentUserId = Convert.ToInt32(User.FindFirstValue(ClaimTypes.NameIdentifier));

                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
            //try
            //{
            //    // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            //    var perms = await GetPermissions(
            //       "/StudentInformation/BulkDelete"
            //    );
            //    var companyId = await GetCompanyId();
            //    var sessionId = await GetSessionId();
            //    var staffId = GetStaffID();
            //    if (staffId == null || staffId == 0)
            //    {
            //        staffId = GetStaffID();
            //        staffId = (staffId ?? 0) <= 0 ? null : staffId;
            //    }
            //    ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId, companyId, staffId)).Data;
            //    return View(perms);
            //}
            //catch (Exception ex)
            //{
            //    var model = new PagePermissions();
            //    TempData["Error"] = ex.Message;
            //    return View(model);
            //}
            
        }
        public async Task<IActionResult> BulkDelete(int? classId, int? sectionId, string? search, string? viewType, int page,
    int pageSize)
        {
            var model = new StudentListPageViewModel();
            try
            {
                model = await BuildBulkDeleteViewModel(classId, sectionId, search, viewType,
                    page, pageSize);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetBulkDeletePartial(int? classId, int? sectionId, string? search,
            string? viewType, int page,
    int pageSize)
        {
            try
            {
                var model = await BuildBulkDeleteViewModel(classId, sectionId, search, viewType,
                    page, pageSize);

                return PartialView("_BulkDeleteTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_BulkDeleteTablePartial", new StudentListPageViewModel());
            }
        }



        /// <summary>
        /// Deletes multiple students in bulk by their IDs.
        /// Use this for mass deletion operations.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> BulkDeleteStudents([FromBody] List<int> ids)
        {
            try
            {
                var res = await _studentService.BulkDeleteStudents(ids);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success =false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the import student page for uploading student data via CSV.
        /// </summary>
        public async Task<IActionResult> ImportStudent()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId,companyId)).Data;
                return View();
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View();
            }
           
        }

        /// <summary>
        /// Imports student data from a CSV file and creates student records.
        /// Use this to bulk import students.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ImportStudent(int classId, int sectionId, IFormFile file)
        {            
            if (file == null || file.Length == 0)
                return Json(new { success = false, message = "Please select a CSV file." });

            try
            {
                var companyId = await GetCompanyId();
                var sessionId =await GetSessionId();
                var userId =  GetUserId();

                var categories =await _studentService.GetAllStudentCategories(sessionId, companyId);
                var houses =await _studentService.GetAllStudentHouses(sessionId,companyId);

                using var reader = new StreamReader(file.OpenReadStream());
                string? headerLine = await reader.ReadLineAsync();
                if (headerLine == null) return Json(new { success = false, message = "File is empty." });

                var headers = headerLine.Split(',').Select(h => h.Trim().ToLower()).ToList();
                var results = new List<object>();

                while (!reader.EndOfStream)
                {
                    string? line = await reader.ReadLineAsync();
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    var values = line.Split(',').Select(v => v.Trim()).ToList();
                    var fieldValues = new Dictionary<string, string>();

                    fieldValues["Class"] = classId.ToString();
                    fieldValues["Section"] = sectionId.ToString();

                    for (int i = 0; i < headers.Count && i < values.Count; i++)
                    {
                        string header = headers[i];
                        string value = values[i];
                        string mappedKey = MapCsvHeaderToKey(header);

                        if (!string.IsNullOrEmpty(mappedKey))
                        {
                            if (mappedKey == "Category")
                            {
                                var cat = categories.Data.FirstOrDefault(c => string.Equals(c.StudentCategoryName, value, StringComparison.OrdinalIgnoreCase));
                                value = cat?.StudentCategoryID.ToString() ?? "";
                            }
                            else if (mappedKey == "House")
                            {
                                var house = houses.Data.FirstOrDefault(h => string.Equals(h.StudentHouseName, value, StringComparison.OrdinalIgnoreCase));
                                value = house?.StudentHouseID.ToString() ?? "";
                            }
                            fieldValues[mappedKey] = value;
                        }
                    }

                    var req = new StudentAdmissionUpsertRequest { StudentID = 0, FieldValues = fieldValues };
                    req.SessionId = sessionId;
                    req.CompanyID = companyId;
                    var res = await _studentService.UpsertStudentAdmission(req);
                    results.Add(new
                    {
                        admissionNo = fieldValues.GetValueOrDefault("Admission No"),
                        name = (fieldValues.GetValueOrDefault("First Name") + " " + fieldValues.GetValueOrDefault("Last Name")).Trim(),
                        success = res.Success,
                        message = res.Message
                    });
                }
                return Json(new { success = true, results });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        private string MapCsvHeaderToKey(string header)
        {
            return header switch
            {
                "admission_no" => "Admission No",
                "roll_no" => "Roll No",
                "first_name" => "First Name",
                "middlename" => "Middle Name",
                "last_name" => "Last Name",
                "gender" => "Gender",
                "date_of_birth" => "Date of Birth",
                "category" => "Category",
                "religion" => "Religion",
                "caste" => "Caste",
                "mobile_no" => "Mobile Number",
                "email" => "Email",
                "admission_date" => "Admission Date",
                "blood_group" => "Blood Group",
                "student_house" => "House",
                "height" => "Height",
                "weight" => "Weight",
                "father_name" => "Father Name",
                "father_phone" => "Father Phone",
                "father_occupation" => "Father Occupation",
                "mother_name" => "Mother Name",
                "mother_phone" => "Mother Phone",
                "mother_occupation" => "Mother Occupation",
                "guardian_is" => "If Guardian Is",
                "guardian_name" => "Guardian Name",
                "guardian_relation" => "Guardian Relation",
                "guardian_email" => "Guardian Email",
                "guardian_phone" => "Guardian Phone",
                "guardian_occupation" => "Guardian Occupation",
                "current_address" => "CurrentAddress",
                "permanent_address" => "PermanentAddress",
                _ => ""
            };
        }

        #region Extracted API Endpoints

        /// <summary>
        /// Retrieves the attendance history for a student for a given year.
        /// Use this to display detailed attendance records.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentAttendanceHistory(int id, int year)
        {
            try
            {
                var data =await _attendanceService.GetStudentAttendanceHistoryAsync(id, year, await GetCompanyId());
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Returns all disable reasons for students as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllDisableReasons()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var data = await _studentService.GetAllDisableReasons(sessionId, companyId);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Creates or updates a disable reason for students.
        /// Use this to add or edit reasons for disabling student records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertDisableReason([FromBody] StudentDisableReasonUpsertRequest req)
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
                var res = await _studentService.UpsertDisableReason(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Deletes one or more disable reasons by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteDisableReason([FromBody] List<int> ids)
        {
            try
            {
                var res = await _studentService.DeleteDisableReason(ids);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all student houses as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStudentHouses()
        {
            try
            {
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();
                var data = await _studentService.GetAllStudentHouses(sessionId, companyId);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Creates or updates a student house.
        /// Use this to add or edit student house records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertStudentHouse([FromBody] StudentHouseUpsertRequest req)
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
                var res = await _studentService.UpsertStudentHouse(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Deletes one or more student houses by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStudentHouse([FromBody] List<int> ids)
        {
            try
            {
                var res = await _studentService.DeleteStudentHouse(ids);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all student categories as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStudentCategories()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var data = await _studentService.GetAllStudentCategories(sessionId, companyId);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Creates or updates a student category.
        /// Use this to add or edit student category records.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertStudentCategory([FromBody] StudentCategoryUpsertRequest req)
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
                var res = await _studentService.UpsertStudentCategory(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Deletes one or more student categories by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStudentCategory([FromBody] List<int> ids)
        {
            try
            {
                var res = await _studentService.DeleteStudentCategory(ids);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Retrieves the timeline (history/events) for a student.
        /// Use this to display important events in a student's academic life.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentTimeline(int id)
        {
            try
            {
                var data =await _studentService.GetStudentTimeline(id);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Database Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Creates or updates a timeline entry for a student.
        /// Use this to add or edit events in a student's timeline.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertTimeline([FromForm] StudentTimelineUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.DocumentName = attachmentFile.FileName;
                    req.DocumentType = attachmentFile.ContentType;

                }

                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }

                var r = await _studentService.UpsertTimeline(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? timelineID = r.Data.Result.TimelineID;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.DocumentName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.DocumentName ?? "photo.jpg",
                                PhotoModule.PostalReceive,
                                FolderNameModule.Documents,
                                timelineID.Value
                            );
                            var attchment = new StudentTimelineAttachmentUpsertRequest
                            {
                                TimelineID = timelineID.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType

                            };
                            var attachment = await _studentService.UpsertStudentTimelineAttachmentFileAsync(attchment);
                        }
                    }
                }
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Database Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Deletes a timeline entry for a student by its ID.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteTimeline(int id)
        {
            try
            {
                var result =await _studentService.DeleteTimeline(id);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Database Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Downloads a document attached to a student's timeline entry.
        /// </summary>
        [SkipPermissionCheck]
        [HttpGet]
        public async Task<IActionResult> DownloadTimelineDoc(int id)
        {
            try
            {
                var response = await _studentService.GetTimelineByIdAsync(id);

                if (!response.Success || response.Data == null)
                    return NotFound();

                return File(
                    response.Data.DocumentContent,
                    response.Data.DocumentType,
                    response.Data.DocumentName);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Database Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Toggles the active/inactive status of a student.
        /// Use this to enable or disable a student record.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StudentStatusToggleRequest req)
        {
            try
            {
                var res = await _studentService.ToggleStatus(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Retrieves a student by their unique ID as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetByID(int id)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var data = await _studentService.GetStudentByIDAsync(id,companyId, sessionId);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Retrieves students assigned to multiple classes, filtered by class, section, or search term.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMultiClassStudents(int? classId, int? sectionId, string? searchTerm)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var data = await _studentService.GetMultiClassStudents(classId, sectionId, companyId, sessionId, searchTerm);
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
           
        }

        public async Task<MultiClassStudentsPageViewModel> BuildMultiClassStudentsViewModel(
    int? classId, int? sectionId, string? search, int page, int pageSize)
        {
            var model = new MultiClassStudentsPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformation/MultiClassStudents");
                model.CanAdd = perms.CanAdd;
                model.CanEdit = perms.CanEdit;
                model.CanDelete = perms.CanDelete;

                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                model.Classes = (await _classService.GetAllAsync(false, sessionId, companyId)).Data;

                if (classId.HasValue && classId.Value > 0)
                {
                    model.Sections = (await _sectionService.GetByClassAsync(classId.Value)).Data;
                }

                var response = await _studentService.GetMultiClassStudents(classId,sectionId,companyId,sessionId,search);

                model.Students = response.Data;
                //model.TotalRecords = response.Data.TotalRecords;
                //model.PageNumber = response.Data.PageNumber;
                //model.PageSize = response.Data.PageSize;
                model.SelectedClassId = classId;
                model.SelectedSectionId = sectionId;
                model.SearchTerm = search;

                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        [HttpGet]
        public async Task<IActionResult> MultiClassStudents(int? classId, int? sectionId, string? search, int page = 1, int pageSize = 10)
        {
            try
            {
                var model = await BuildMultiClassStudentsViewModel(classId, sectionId, search, page, pageSize);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(new MultiClassStudentsPageViewModel());
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetMultiClassStudentsPartial(
            int? classId, int? sectionId, string? search, int page = 1, int pageSize = 10)
        {
            try
            {
                var model = await BuildMultiClassStudentsViewModel(classId, sectionId, search, page, pageSize);
                return PartialView("_MultiClassStudentsPartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_MultiClassStudentsPartial", new MultiClassStudentsPageViewModel());
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSectionsByClass(int classId)
        {
            try
            {
                var sections = (await _sectionService.GetByClassAsync(classId)).Data;
                var data = sections.Select(s => new { sectionID = s.SectionID, sectionName = s.SectionName });
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates or updates a multi-class assignment for a student.
        /// Use this to assign a student to multiple classes.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertMultiClass([FromBody] StudentMultiClassUpsertRequest req)
        {
            try
            {
                var res = await _studentService.UpsertMultiClass(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Deletes a multi-class assignment for a student by its ID.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteMultiClass(int id)
        {
            try
            {
                var res = await _studentService.DeleteMultiClass(id);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all classes as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetClasses()
        {
            try
            {
                var data = await _classService.GetAllAsync();
                return Json(new { success = true, data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Returns all sections for a given class as JSON.
        /// </summary>
        //[HttpGet]
        //public async Task<IActionResult> GetSectionsByClass(int id)
        //{
        //    try
        //    {
        //        var response = await _sectionService.GetByClassAsync(id);
        //        return Json(new { response.Success, response.Data });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = "Error: " + ex.Message });
        //    }
            
        //}

        #endregion

        /// <summary>
        /// Shows the add/edit form for a student category.
        /// Use this to display the UI for creating or editing a student category.
        /// </summary>
        public async Task<IActionResult> AddStudentCategory(int? id) 
        {
            var model = new StudentCategoryAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/StudentHouse"
                );
                // Step 1: Initialize a new blank page model.
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _studentService.GetStudentCategoryByIdAsync(id.Value,companyId,sessionId);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditStudentCategory = response.Data;
                    }
                }
                else
                {
                    model.EditStudentCategory = null;
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
        /// Shows the add/edit form for a student house.
        /// Use this to display the UI for creating or editing a student house.
        /// </summary>
        public async Task<IActionResult> AddStudentHouse(int? id)
        {
            var model = new StudentHouseAddViewModel(); //StudentHouseViewModel
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/StudentHouse"
                );
                // Step 1: Initialize a new blank page model.
                
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _studentService.GetStudentHouseByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditStudentHouse = response.Data;
                    }
                }
                else
                {
                    model.EditStudentHouse = null;
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
        /// Shows the add/edit form for a disable reason.
        /// Use this to display the UI for creating or editing a disable reason.
        /// </summary>
        public async Task<IActionResult> AddDisableReason(int? id)
        {
            var model = new StudentDisableReasonAddViewModel(); //StudentHouseViewModel
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/StudentHouse"
                );
                // Step 1: Initialize a new blank page model.
               
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _studentService.GetDisableReasonsByID(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditStudentDisableReason = response.Data;
                    }
                }
                else
                {
                    model.EditStudentDisableReason = null;
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
        /// Shows the detailed student profile page, including transport, address, and document information.
        /// Use this to view all details about a student.
        /// </summary>
        public async Task<IActionResult> StudentDetails(int? id) 
        {
            var model= new StudentDetailsViewModel();
            try
            {
                var perms = await GetPermissions(
                    "/StudentInformation/Students"
                );
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();


                var role = User.FindFirst("UserTypeName")?.Value;
                if (role.Trim() == "Student") 
                {
                    id = int.Parse(User.FindFirst("StudentID")?.Value);
                }

                    // Fetch all fields to ensure Transport, Hostel, and Guardian categories are included
                var fields = await _fieldService.GetByAllRecordStudetFiledAsync(companyId, sessionId, belongsTo: "students",id);
                var studentTransport =await _vehicleAssignService.GetTransportDetailsByStudentsAsync(companyId, sessionId,id.Value);
                var studentAddress =await _studentService.GetStudentAddressListAsync(companyId, sessionId,id.Value);
                var studentDocument =await _studentService.GetStudentDocumentsAsync(id.Value);
                var studentFee =await _studentService.GetStudentFeeTemplateListAsync(id.Value, companyId, sessionId);
                if (id.HasValue && id > 0)
                {
                    var studentDetails = await _studentService.GetStudentByIDAsync(id.Value, companyId, sessionId);
                    var studentloginDetails = await _studentService.GetStudentLoginDetailsBindAsync(studentDetails.Data.BasicInfo.StudentUserID.Value);
                    if (studentDetails.Data.BasicInfo.StudentID > 0)
                    {
                        
                        ViewBag.StudentDetails = studentDetails.Data;
                        ViewBag.IsEdit = true;
                    }
                    model = studentDetails.Data;
                    var studentTimeline = await _studentService.GetStudentTimeline(id.Value);
                    if(studentTimeline != null) 
                    {
                        model.StudentTimeline = studentTimeline.Data;
                    }
                    
                    model.Permissions = perms;
                    model.StudentFields = fields.Data;
                    model.studentTransportDetailsModel = studentTransport.Data;
                    model.StudentAddress = studentAddress.Data;
                    model.StudentDocuments = studentDocument.Data;
                    model.StudentLoginDetails = studentloginDetails.Data;
                    model.studentFeeDetailsModel = studentFee.Data;
                }
                model.StudentId = id;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Retrieves a summary of a student's attendance for a given year and status.
        /// Use this to display attendance statistics and details.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentAttendanceSummary(int? year,int studentId,int? status) 
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var role = User.FindFirst("UserTypeName")?.Value;
                if (role != null && role.Trim() == "Student")
                {
                    studentId = int.Parse(User.FindFirst("StudentID")?.Value);
                }

                var res = await _attendanceService.GetStudentAttendanceSummaryAsync(companyId, sessionId, studentId, year, status);

                return Json(new
                {
                    success = res != null,
                    totals = res?.Data.Totals,
                    rows = res?.Data.AttendanceRows
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> BulkUpsertMultiClass([FromBody] MultiClassBulkSaveRequest request)
        {
            try
            {
                if (request == null || request.StudentID <= 0 || request.Rows == null || request.Rows.Count == 0)
                {
                    return Json(new { success = false, message = "No changes to save." });
                }

                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                int currentUserId = Convert.ToInt32(User.FindFirstValue(ClaimTypes.NameIdentifier));
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();
                var result = await _studentService.BulkUpsertMultiClassAsync(request);

                return Json(new { result.Success, result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> StudentDisable(int? id)
        {
            var model = new StudentDisablePageViewModel(); //StudentHouseViewModel
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/Add"
                );
                // Step 1: Initialize a new blank page model.
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _studentService.GetAllDisableReasons(sessionId, companyId,true);

                    model.Items = response.Data ?? new List<StudentDisableReasonViewModel>();

                    var item = await _studentService.GetStudentDisableAsync(id.Value,companyId,sessionId);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditStudentDisable = item.Data;
                    }
                }
                else
                {
                    //model.EditStudentDisable = null;
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

        [HttpPost]
        public async Task<IActionResult> UpsertStudentDisable([FromBody] StudentDisableReq req)
        {
            try
            {
                req.SessionID = await GetSessionId();
                req.CompanyID = await GetCompanyId();
                var res = await _studentService.UpsertStudentDisableAsync(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ToggleStudentCategoryStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {                
                var r = await _studentService.ToggleStudentCategoryStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllStudentCategory(int companyId, int sessionId)
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
                var response = await _studentService.GetAllStudentCategories(sessionId, companyId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyStudentCategory([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _studentService.CopyStudentCategoryAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        //[HttpGet]
        //public async Task<IActionResult> GetAllStudentHouses(int companyId, int sessionId)
        //{
        //    try
        //    {
        //        if (companyId == null || companyId == 0)
        //        {
        //            companyId = await GetCompanyId();
        //        }
        //        if (sessionId == null || sessionId == 0)
        //        {
        //            sessionId = await GetSessionId();
        //        }
        //        var response = await _studentService.GetAllStudentHouses(sessionId, companyId);
        //        return Json(new { success = response.Success, data = response.Data });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = ex.Message });
        //    }
        //}

        [HttpPost]
        public async Task<IActionResult> ToggleStudentHouseStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _studentService.ToggleStudentHouseStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyStudentHouse([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _studentService.CopyStudentHouseAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ToggleDisableReasonStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var r = await _studentService.ToggleDisableReasonStatusAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopyDisableReason([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _studentService.CopyDisableReasonAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> AddStudentTimeline(int? id,int studentId)
        {
            var model = new StudentTimelineAddViewModel(); //StudentHouseViewModel
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/StudentHouse"
                );
                // Step 1: Initialize a new blank page model.

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _studentService.GetTimelineByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditStudentTimeline = response.Data;                        
                    }
                }
                else
                {
                    model.EditStudentTimeline = null;
                }
                model.StudentID = studentId;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> StudentChangePassword([FromBody] StatusChangePassRequest request)
        {
            try
            {
                var r = await _studentService.StudentChangePasswordAsync(request);
                return Json(new { success = r.Success, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> BatchStatus(Guid batchId)
        {
            var status = await _studentService.BatchStatusAsync(batchId);
            return Json(status);           // { total, sent, failed, pending }
        }


        [HttpPost]
        public async Task<IActionResult> GetFeeTemplateByClassSection([FromBody] FeeTemplateGetByClassSectionRequest request)
        {
            try
            {
                if (request.COMPANYID == 0)
                {
                    request.COMPANYID = await GetCompanyId();
                }
                if (request.SESSIONID == 0)
                {
                    request.SESSIONID = await GetSessionId();
                }
                var response = await _feeTemplateService.GetFeeTemplateByClassSectionAsync(request);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendBulkMail([FromBody] BulkMailSendRequest req)
        {
            if (req == null || req.EmailTemplateId <= 0 || string.IsNullOrWhiteSpace(req.MessageTo))
                return Json(new { success = false, message = "Message To and Notification Type are required." });
            var companyid = await GetCompanyId();
            req.CompanyId = companyid;
            List<int> ids;
            if (req.SelectAll)
            {
                // SAME filter logic as GetBulkMailPartial, but with NO paging
                var res = await _studentService.GetFilteredStudentIdsAsync(companyid, req.Search, req.ClassId, req.SectionId);
                ids = res.Data;
                ids = ids.Except(req.ExcludedIds).ToList();
            }
            else
            {
                ids = req.StudentIds.Distinct().ToList();
            }

            if (ids.Count == 0)
                return Json(new { success = false, message = "No students selected." });

            // 1. load the template (Title, Message HTML, Attachment)
            // 2. resolve each student's email by req.MessageTo (Student / Father / Mother)
            // 3. send or queue the emails, skipping blank or invalid addresses
            var response = await _studentService.SendBulkMailAsync(req);

          //  return Json(new { success = true, message = $"{sent} email(s) sent, {skipped} skipped (no email address)." });

            return Json(new { success = true, Data = response.Data });
        }
    }
}
