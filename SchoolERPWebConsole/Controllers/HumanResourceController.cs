using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mono.TextTemplating;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;


namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the school's human resources, including staff information, job designations, departments, and leave policies.
    /// </summary>
    public class HumanResourceController : BaseController
    {
        private readonly IHumanResourceClientService _hrClient;
        private readonly IRoleClientService _roleClient;
        private readonly IUserTypeClientService _userTypeClient;
        private readonly ICompanyClientService _companyClient;
        private readonly ISettingsClientService _settingsClient;
        private readonly ISessionClientService _sessionService;
        private readonly IPhotoUploadService _photoService;
        private readonly IBackDateSettingClientService _backDateSettingService;
        private readonly ICountryClientService _countryService;

        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        private const string DesignationMenuPath = "/HumanResource/Designation";
        private const string DepartmentMenuPath = "/HumanResource/Department";
        private const string LeaveTypeMenuPath = "/HumanResource/LeaveType";
        private const string StaffMenuPath = "/HumanResource/Staffs";

        public HumanResourceController(
            IHumanResourceClientService hrClient,
            IRoleClientService roleClient,
            IUserTypeClientService userTypeClient,
            ICompanyClientService companyClient,
            ISettingsClientService settingsClient,
            ISessionClientService sessionService,
            IPhotoUploadService photoService, PermissionHelper permHelper,
            IBackDateSettingClientService backDateSettingService,
            IConfiguration configuration, IWebHostEnvironment environment, ICountryClientService countryService) : base(permHelper)
        {
            _hrClient = hrClient;
            _roleClient = roleClient;
            _userTypeClient = userTypeClient;
            _companyClient = companyClient;
            _settingsClient = settingsClient;
            _sessionService = sessionService;
            _photoService = photoService;
            _backDateSettingService = backDateSettingService;
            _configuration = configuration;
            _environment = environment;
            _countryService = countryService;
        }

        private int GetUserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("UserId"), out var id) ? id : 0;
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == default(int))
            {
                var response = await _companyClient.GetUserCurrentCompanyAsync();
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
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        private int GetRoleId()
        {
            var roleIdClaim = User.FindFirst("RoleId")?.Value;
            int.TryParse(roleIdClaim, out int roleId);
            return roleId; // returns 0 if claim missing or invalid
        }
        /// <summary>
        /// Shows the 'Designation' page where you can manage different job titles (like Teacher, Admin, or Accountant).
        /// </summary>

        public async Task<HRDesignationPageViewModel> BuildDesignationPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HRDesignationPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Designation"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };


                // Step 1: Ask the system for all the job titles currently set up.
                var res = await _hrClient.GetAllDesignationsWithPageAsync(request);
                // Step 2: Prepare the list to be shown on the screen.
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyClient.GetAllAsync();
                await Task.WhenAll(sessionTask, companiesTask);

                var pagedResult = res;
                model = new HRDesignationPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<HRDesignationViewModel>(),
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

        public async Task<IActionResult> Designation(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HRDesignationPageViewModel();
            try
            {

                model = await BuildDesignationPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetDesignationPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildDesignationPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_DesignationTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_DesignationTablePartial", new HRDesignationPageViewModel());
            }
        }


        public async Task<IActionResult> AddDesignation(int? id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Designation"
               );

                // Step 2: Prepare the list to be shown on the screen.
                var model = new HRDesignationAddPageViewModel();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _hrClient.GetDesignationByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
                }
                model.Permissions = perms;
                // Step 3: Open the 'Designation' page.
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }

        }

        /// <summary>
        /// Shows the 'Department' page where you can manage different departments in the school (like Academic, Finance, or Sports).
        /// </summary>
        public async Task<IActionResult> Department(int? pageIndex,int? pageSize,string? search,int? companyId,int? sessionID)
        {
            var model = new DepartmentListResponse();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Department"
               );
                //var res = await _hrClient.GetAllDepartmentsAsync();


                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };
                // Step 1: Ask the system for all the job titles currently set up.
                var res = await _hrClient.GetAllDepartmentsWithPageAsync(request);
                // Step 2: Prepare the list to be shown on the screen.
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyClient.GetAllAsync();
                await Task.WhenAll(sessionTask, companiesTask);

                var pagedResult = res;
                model = new DepartmentListResponse
                {
                    Data = pagedResult.Success ? pagedResult.Data.Data : new List<HRDepartmentViewModel>(),
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
                // Step 3: Open the 'Designation' page.
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }

        }


        public async Task<IActionResult> AddDepartment(int? id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Department"
               );

                // Step 2: Prepare the list to be shown on the screen.
                var model = new DepartmentAddPageViewModel();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _hrClient.GetDepartmentByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
                }
                model.Permissions = perms;
                // Step 3: Open the 'Designation' page.
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }

        }

        /// <summary>
        /// Shows the 'Leave Type' page where you can define different types of employee leave (like Medical Leave or Casual Leave).
        /// </summary>
       
        public async Task<HRLeaveTypePageViewModel> BuildLeaveTypePageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HRLeaveTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/LeaveType"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };


                // Step 1: Ask the system for all the job titles currently set up.
                var res = await _hrClient.GetAllLeaveTypesWithPageAsync(request);
                // Step 2: Prepare the list to be shown on the screen.
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyClient.GetAllAsync();
                await Task.WhenAll(sessionTask, companiesTask);

                var pagedResult = res;
                model = new HRLeaveTypePageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<HRLeaveTypeViewModel>(),
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

                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                // Step 3: Open the 'Setup' page for the user.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> LeaveType(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HRLeaveTypePageViewModel();
            try
            {
                model = await BuildLeaveTypePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetLeaveTypePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildLeaveTypePageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_LeaveTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LeaveTypeTablePartial", new HRLeaveTypePageViewModel());
            }
        }

        public async Task<IActionResult> AddLeaveType(int? id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Designation"
               );

                // Step 2: Prepare the list to be shown on the screen.
                var model = new HRLeaveTypeAddPageViewModel();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _hrClient.GetLeaveTypeByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditItems = response.Data;
                    }
                }
                else
                {
                    model.EditItems = null;
                }
                model.Permissions = perms;
                // Step 3: Open the 'Designation' page.
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }

        }
        /// <summary>
        /// Shows the 'Add Staff' page where you can register a new employee or update an existing employee's details.
        /// </summary>
        public async Task<IActionResult> AddStaff(int? id)
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                // Step 1: Initialize a new blank page model.
                var model = new HRStaffPageViewModel();

                // Step 2: Fetch all the necessary dropdown lists (Designations, Departments, Roles, User Types, and School Branches).
                var desigRes = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                model.Designations = desigRes.Success ? desigRes.Data : new List<HRDesignationViewModel>();

                var deptRes = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                model.Departments = deptRes.Success ? deptRes.Data.Data : new List<HRDepartmentViewModel>();

                var leaveRes = await _hrClient.GetAllLeaveTypesAsync(sessionId,companyId);
                model.LeaveTypes = leaveRes.Success ? leaveRes.Data : new List<HRLeaveTypeViewModel>();

                var rolesRes = await _roleClient.GetAllRolesAsync();
                model.Roles = rolesRes.Success ? rolesRes.Data : new List<MstRoleViewModel>();

                var typesRes = await _userTypeClient.GetAllAsync();
                model.UserTypes = typesRes.Success ? typesRes.Data : new List<MstUserTypeViewModel>();

                var compRes = await _companyClient.GetAllAsync();
                model.Companies = compRes.Success ? compRes.Data : new List<MstCompanyViewModel>();

                var fieldRes = await _settingsClient.GetAllFieldsAsync(companyId,sessionId, isSystemField: null, belongsTo: "Staff");
                var allFields = fieldRes.Success ? fieldRes.Data : new List<FieldModel>();
                model.SystemFields = allFields.Where(f => f.IsSystemField).ToList();
                model.CustomFields = allFields.Where(f => !f.IsSystemField).ToList();

                var country = await _countryService.GetAllAsync(await GetCompanyId(), sessionId);
                model.Countries = country.Success ? country.Data : new List<CountryModel>();
                // Step 3: If we are editing an existing person (ID is provided), fetch their details.

                if (id.HasValue && id.Value > 0)
                {
                    var staffRes = await _hrClient.GetStaffByIDAsync(id.Value);
                    if (staffRes.Success)
                    {
                        model.EditStaff = staffRes.Data;
                    }
                }
                // Step 4: If this is a new person, generate a fresh Staff ID code for them.
                else
                {
                    var codeRes = await _hrClient.GetNewStaffCodeAsync(companyId,sessionId);
                    model.NewStaffCode = codeRes.Success ? codeRes.Data : "";
                }

                // Step 5: Open the 'Add Staff' page with all the gathered information.
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }
        /// <summary>
        /// Shows the 'Staff Directory' page, displaying a list of all current school employees.
        /// </summary>
        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> Staffsold(string? search, string? roleName, string? designationName, string? departmentName, string? viewType)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/HumanResource/Staffs");

                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }

                var allStaff = (await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId)).Data;

                // ===== Populate DisplayRoles =====
                // The HR API returns RoleName (a single, possibly comma-separated string)
                // but does not populate DisplayRoles (List<string>) used by the view for role badges.
                // Map it here so the UI can render one or more role badges correctly.
                if (allStaff != null)
                {
                    foreach (var s in allStaff)
                    {
                        s.DisplayRoles = !string.IsNullOrWhiteSpace(s.RoleName)
                            ? s.RoleName
                                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                .ToList()
                            : new List<string>();
                    }
                }

                // Server-side Filtering
                if (!string.IsNullOrEmpty(search))
                {
                    search = search.ToLower();
                    allStaff = allStaff.Where(s =>
                        (s.FirstName + " " + s.LastName).ToLower().Contains(search) ||
                        s.StaffCode.ToLower().Contains(search)
                    ).ToList();
                }

                if (!string.IsNullOrEmpty(roleName))
                {
                    allStaff = allStaff.Where(s =>
                        s.DisplayRoles != null && s.DisplayRoles.Contains(roleName)
                    ).ToList();
                }

                if (!string.IsNullOrEmpty(designationName))
                {
                    allStaff = allStaff.Where(s => s.DesignationName == designationName).ToList();
                }

                if (!string.IsNullOrEmpty(departmentName))
                {
                    allStaff = allStaff.Where(s => s.DepartmentName == departmentName).ToList();
                }

                var fieldRes = await _settingsClient.GetAllFieldsAsync(companyId, sessionId, isSystemField: null, belongsTo: "Staff");
                var allFields = fieldRes.Success ? fieldRes.Data : new List<FieldModel>();

                // this code used if any time data null code working not any error get null
                var depmodel = new List<HRDepartmentViewModel>();
                var depart = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                if (depart.Success)
                {
                    depmodel = depart.Data.Data;
                }

                // this code used if any time data null code working not any error get null
                var desimodel = new List<HRDesignationViewModel>();
                var desi = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                if (desi.Success)
                {
                    desimodel = desi.Data;
                }

                // this code used if any time data null code working not any error get null
                var rolesmodel = new List<MstRoleViewModel>();
                var roles = await _roleClient.GetAllRolesAsync();
                if (roles.Success)
                {
                    rolesmodel = roles.Data;
                }

                var model = new HRStaffPageViewModel
                {
                    Roles = rolesmodel,
                    Departments = depmodel,
                    Designations = desimodel,
                    StaffList = allStaff,
                    ViewType = viewType ?? "list",
                    SearchTerm = search,
                    SelectedRole = roleName,
                    SelectedDesignation = designationName,
                    SelectedDepartment = departmentName,
                    SystemFields = allFields.Where(f => f.IsSystemField).ToList(),
                    CustomFields = allFields.Where(f => !f.IsSystemField).ToList()
                };
                model.Permissions = perms;

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }


        private async Task<HRStaffPageViewModel> BuildStaffsPageViewModel(SearchHRStaffRequest request)
        {
            var model = new HRStaffPageViewModel();
            try
            {
                var perms = await GetPermissions("/HumanResource/Staffs");
                var companyId = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                var sessionId = request.SessionID > 0 ? request.SessionID : await GetSessionId();
                var pageNumber = request.PageNumber > 0 ? request.PageNumber : 1;
                request.CompanyID = companyId;
                request.SessionID = sessionId;
                request.PageNumber = pageNumber;
                // ── Pagination defaults ──
                request.PageNumber = (request.PageNumber ?? 1) <= 0 ? 1 : request.PageNumber;
                request.PageSize = request.PageSize <= 0 ? 10 : request.PageSize;

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }

                var allStaff = await _hrClient.GetAllStaffWithPageAsync(request);
                var fieldRes = await _settingsClient.GetAllFieldsAsync(companyId, sessionId, isSystemField: null, belongsTo: "Staff");
                var allFields = fieldRes.Success ? fieldRes.Data : new List<FieldModel>();

                // this code used if any time data null code working not any error get null
                var depmodel = new List<HRDepartmentViewModel>();
                var depart = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                if (depart.Success)
                {
                    depmodel = depart.Data.Data;
                }

                // this code used if any time data null code working not any error get null
                var desimodel = new List<HRDesignationViewModel>();
                var desi = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                if (desi.Success)
                {
                    desimodel = desi.Data;
                }

                // this code used if any time data null code working not any error get null
                var rolesmodel = new List<MstRoleViewModel>();
                var roles = await _roleClient.GetAllRolesAsync();
                if (roles.Success)
                {
                    rolesmodel = roles.Data;
                }

                var pagedResult = allStaff;

                // ── Resolve selected filter display names (for the active-filter badges) ──
                string? selectedRoleName = request.RoleID.HasValue
                    ? rolesmodel.FirstOrDefault(r => r.RoleID == request.RoleID.Value)?.RoleName
                    : null;
                string? selectedDeptName = request.DepartmentID.HasValue
                    ? depmodel.FirstOrDefault(d => d.DepartmentID == request.DepartmentID.Value)?.DepartmentName
                    : null;
                string? selectedDesigName = request.DesignationID.HasValue
                    ? desimodel.FirstOrDefault(d => d.HRDesignationID == request.DesignationID.Value)?.DesignationName
                    : null;

                // ── TotalRecords: adjust this line if your paged wrapper names the count differently ──
                int totalRecords = 0;
                if (pagedResult.Success && pagedResult.Data != null)
                {
                    totalRecords = pagedResult.Data.TotalRecords; // ASSUMPTION: verify this property exists on your paged wrapper
                }

                model = new HRStaffPageViewModel
                {
                    Roles = rolesmodel,
                    Departments = depmodel,
                    Designations = desimodel,
                    StaffList = pagedResult.Success ? pagedResult.Data.Data : new List<HRStaffViewModel>(),
                    ViewType = request.viewType ?? "list",
                    SearchTerm = request.SearchKeyword,
                    SelectedRoleID = request.RoleID,
                    SelectedDepartmentID = request.DepartmentID,
                    SelectedDesignationID = request.DesignationID,
                    SelectedRole = selectedRoleName,
                    SelectedDesignation = selectedDesigName,
                    SelectedDepartment = selectedDeptName,
                    SystemFields = allFields.Where(f => f.IsSystemField).ToList(),
                    CustomFields = allFields.Where(f => !f.IsSystemField).ToList(),
                    PageNumber = request.PageNumber ?? 1,
                    PageSize = request.PageSize,
                    TotalRecords = totalRecords
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
        /// Staff Disable
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        //public async Task<IActionResult> StaffDisable(int? id)
        //{
        //    var model = new HRStaffAttendanceViewModel();
        //    try
        //    {
        //        var perms = await GetPermissions(
        //            "/StudentInformation/Add"
        //        );
               
        //        var companyId = await GetCompanyId();
        //        var sessionId = await GetSessionId();
        //        if (id.HasValue && id.Value > 0)
        //        {
        //            var response = await _hrClient.GetAllStaffAsync(sessionId, companyId);

        //            model = response.Data ?? new HRStaffPageViewModel();

        //            var item = await _hrClient.GetAllStaffAsync(id.Value, companyId, sessionId);
        //            if (response.Success)
        //            {
        //                model.Items = response.Data;
        //                model = item.Data;
        //            }
        //        }

        //        model.Permissions = perms;
        //        return View(model);
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return View(model);
        //    }
        //}



        public async Task<IActionResult> Staffs(SearchHRStaffRequest request)
        {
            var model = new HRStaffPageViewModel();
            try
            {
                model = await BuildStaffsPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStaffsPartial(SearchHRStaffRequest request)
        {
            try
            {
                var model = await BuildStaffsPageViewModel(request);
                return PartialView("_StaffsTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StaffsTablePartial", new HRStaffPageViewModel());
            }
        }


        // GET: Loads the Enable/Disable Staff page
        public async Task<IActionResult> ToggleStaffStatus(int id, bool isActive)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/StaffDetails"
               );

                // Prepare the model to be shown on the screen.
                var model = new HRStaffStatusTogglePageViewModel
                {
                    EditItem = new HRStaffStatusToggleRequest
                    {
                        StaffId = id,
                        IsActive = isActive
                    }
                };
                model.Permissions = perms;

                // Open the 'Toggle Staff Status' page.
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        // POST: Confirms the status change (called via AJAX from confirmStatusToggle())
        [HttpPost]
        public async Task<IActionResult> ConfirmStatusToggle([FromBody] HRStaffStatusToggleRequest request)
        {
            try
            {
                // Step 1: Validate incoming data
                if (request == null || request.StaffId <= 0)
                {
                    return Json(new { success = false, message = "Invalid staff record." });
                }

                if (!request.IsActive && !request.StatusDate.HasValue)
                {
                    return Json(new { success = false, message = "Please select a date of leaving." });
                }

                // Step 2: Call the API/service to update the status
                var response = await _hrClient.ToggleStaffStatusAsync(request);

                if (!response.Success)
                {
                    return Json(new { success = false, message = response.Message ?? "Failed to update staff status." });
                }

                // Step 3: Return success
                return Json(new { success = true, message = "Staff status updated successfully." });
            }
            catch (Exception)
            {
                throw;
            }
        }
        #region Disable Staffs

        private async Task<HRStaffPageViewModel> BuildDisableStaffPageViewModel(SearchHRStaffRequest request)
        {
            var model = new HRStaffPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");
                var companyId = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                var sessionId = request.SessionID > 0 ? request.SessionID : await GetSessionId();
                var pageNumber = request.PageNumber > 0 ? request.PageNumber : 1;
                request.CompanyID = companyId;
                request.SessionID = sessionId;
                request.PageNumber = pageNumber;
                // ── Pagination defaults ──
                request.PageNumber = (request.PageNumber ?? 1) <= 0 ? 1 : request.PageNumber;
                request.PageSize = request.PageSize <= 0 ? 10 : request.PageSize;

                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }

                var allStaff = await _hrClient.GetAllDisableStaffWithPageAsync(request);
                var fieldRes = await _settingsClient.GetAllFieldsAsync(companyId, sessionId, isSystemField: null, belongsTo: "Staff");
                var allFields = fieldRes.Success ? fieldRes.Data : new List<FieldModel>();

                // this code used if any time data null code working not any error get null
                var depmodel = new List<HRDepartmentViewModel>();
                var depart = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                if (depart.Success)
                {
                    depmodel = depart.Data.Data;
                }

                // this code used if any time data null code working not any error get null
                var desimodel = new List<HRDesignationViewModel>();
                var desi = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                if (desi.Success)
                {
                    desimodel = desi.Data;
                }

                // this code used if any time data null code working not any error get null
                var rolesmodel = new List<MstRoleViewModel>();
                var roles = await _roleClient.GetAllRolesAsync();
                if (roles.Success)
                {
                    rolesmodel = roles.Data;
                }

                var pagedResult = allStaff;

                // ── Resolve selected filter display names (for the active-filter badges) ──
                string? selectedRoleName = request.RoleID.HasValue
                    ? rolesmodel.FirstOrDefault(r => r.RoleID == request.RoleID.Value)?.RoleName
                    : null;
                string? selectedDeptName = request.DepartmentID.HasValue
                    ? depmodel.FirstOrDefault(d => d.DepartmentID == request.DepartmentID.Value)?.DepartmentName
                    : null;
                string? selectedDesigName = request.DesignationID.HasValue
                    ? desimodel.FirstOrDefault(d => d.HRDesignationID == request.DesignationID.Value)?.DesignationName
                    : null;

                // ── TotalRecords: adjust this line if your paged wrapper names the count differently ──
                int totalRecords = 0;
                if (pagedResult.Success && pagedResult.Data != null)
                {
                    totalRecords = pagedResult.Data.TotalRecords; // ASSUMPTION: verify this property exists on your paged wrapper
                }

                model = new HRStaffPageViewModel
                {
                    Roles = rolesmodel,
                    Departments = depmodel,
                    Designations = desimodel,
                    StaffList = pagedResult.Success ? pagedResult.Data.Data : new List<HRStaffViewModel>(),
                    ViewType = request.viewType ?? "list",
                    SearchTerm = request.SearchKeyword,
                    SelectedRoleID = request.RoleID,
                    SelectedDepartmentID = request.DepartmentID,
                    SelectedDesignationID = request.DesignationID,
                    SelectedRole = selectedRoleName,
                    SelectedDesignation = selectedDesigName,
                    SelectedDepartment = selectedDeptName,
                    SystemFields = allFields.Where(f => f.IsSystemField).ToList(),
                    CustomFields = allFields.Where(f => !f.IsSystemField).ToList(),
                    PageNumber = request.PageNumber ?? 1,
                    PageSize = request.PageSize,
                    TotalRecords = totalRecords
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> DisableStaffs(SearchHRStaffRequest request)
        {
            var model = new HRStaffPageViewModel();
            try
            {
                model = await BuildDisableStaffPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetDisableStaffPartial(SearchHRStaffRequest request)
        {
            try
            {
                var model = await BuildDisableStaffPageViewModel(request);
                return PartialView("_DisableStaffPartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_DisableStaffTablePartial", new HRStaffPageViewModel());
            }
        }
        #endregion

        public async Task<IActionResult> DisableStaffsold()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/HumanResource/DisableStaffs");
                var model = new HRStaffPageViewModel();
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var desigRes = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                model.Designations = desigRes.Success ? desigRes.Data : new List<HRDesignationViewModel>();

                var deptRes = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                model.Departments = deptRes.Success ? deptRes.Data.Data : new List<HRDepartmentViewModel>();

                var rolesRes = await _roleClient.GetAllRolesAsync();
                model.Roles = rolesRes.Success ? rolesRes.Data : new List<MstRoleViewModel>();

                var staffRes = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                // Filter DISABLED ONLY
                model.StaffList = staffRes.Success ? staffRes.Data.Where(s => !s.IsActive).ToList() : new List<HRStaffViewModel>();
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }

        }
        [SkipPermissionCheck]
        public async Task<IActionResult> StaffDetails(int id)
        {
            var model = new HRStaddDetailsViewModel();
            try
            {
                var perms = await GetPermissions("/HumanResource/StaffDetails");
                var res = await _hrClient.GetStaffByIDAsync(id);
                if (!res.Success || res.Data == null)
                {
                    return RedirectToAction("Staffs");
                }
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var fieldRes = await _settingsClient.GetAllFieldsAsync(companyId, sessionId, isSystemField: true, belongsTo: "Staff");
                res.Data.SystemFields = fieldRes.Success ? fieldRes.Data : new List<FieldModel>();
                model.StaffViewModel = res.Data;
                model.Permissions = perms;

                var staffTimeLine =await _hrClient.GetStaffTimelineAsync(id);
                model.StaffTimeLine = staffTimeLine.Data;
                //perms
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }

        //public async Task<IActionResult> StaffAttendance()
        //{
        //    var res = await _roleClient.GetAllRolesAsync();
        //    var model = new HRStaffPageViewModel
        //    {
        //        Roles = res.Data ?? new List<MstRoleViewModel>()
        //    };
        //    return View(model);
        //}
        //Add ApplyLeave method to show the 'Apply Leave' page where staff members can request time off.
        public async Task<IActionResult> AddApplyLeave(int? id)
        {
            var perms = await GetPermissions("/HumanResource/ApplyLeave");
            var model = new HRApplyLeavePageViewModel();

            int userId = GetUserId();
            var companyId = await GetCompanyId();
            var sessionId = await GetSessionId();
            var staffId = GetStaffID();
            staffId = (staffId ?? 0) <= 0 ? null : staffId;

            model.LeaveTypes = (await _hrClient.GetAllLeaveTypesAsync(sessionId,companyId)).Data;

            var allStaff = (await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId)).Data;
            var currentStaff = allStaff.FirstOrDefault(s => s.UserID == userId);
            model.StaffList = allStaff;

            if (id.HasValue && id.Value > 0)
            {
                var response = await _hrClient.GetApplyLeaveByIDAsync(id.Value);
                if (response.Success)
                {
                    model.EditApplyLeave = response.Data;
                }
            }

            model.Permissions = perms;
            return View(model);
        }


        /// <summary>
        /// Shows the 'Apply Leave' page where staff members can request time off.
        /// They can see their own past leave requests and check the status of pending requests.
        /// </summary>
        public async Task<IActionResult> ApplyLeaveOld()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/ApplyLeave"
               );
                int userId = GetUserId();
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var allStaff = (await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId)).Data;
                var currentStaff = allStaff.FirstOrDefault(s => s.UserID == userId);

                // Fallback: If not found in current company (often 0 on fresh login), search globally
                if (currentStaff == null)
                {
                    var globalStaff = (await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId)).Data;
                    currentStaff = globalStaff.FirstOrDefault(s => s.UserID == userId);
                }

                var model = new HRApplyLeavePageViewModel();

                if (currentStaff != null)
                {
                    // Use staff's own company/session if current ones are invalid
                    if (companyId <= 0) companyId = currentStaff.CompanyID;
                    if (sessionId <= 0) sessionId = currentStaff.SessionID;

                    // Only show leaves for this staff member
                    model.Leaves = (await _hrClient.GetAllApplyLeaveAsync()).Data
                        .Where(l => l.StaffID == currentStaff.StaffID).ToList();

                    // Set the current staff as the only option
                    model.StaffList = new List<HRStaffViewModel> { currentStaff };
                }
                else
                {
                    model.Leaves = new List<HRApplyLeaveViewModel>();
                    model.StaffList = new List<HRStaffViewModel>();
                }

                // Ensure we fetch leave types for the correct company
                model.LeaveTypes = (await _hrClient.GetAllLeaveTypesAsync(sessionId, companyId)).Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }

        }

        public async Task<HRApplyLeavePageViewModel> BuildApplyLeavePageViewModel(int? pageIndex,
       int? pageSize,
       string? search,
       int? companyId,
       int? sessionID,
       int? staffId)
        {
            var model = new HRApplyLeavePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/ApplyLeave"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    StaffId= staffId ?? GetStaffID()
                };
                int userId = GetUserId();
                var sessionId = await GetSessionId();
                //var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                request.StaffId = staffId;
                // Step 1: Ask the system for all the job titles currently set up.
                var res = await _hrClient.GetAllApplyLeaveWithPageAsync(request);
                // Step 2: Prepare the list to be shown on the screen.
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyClient.GetAllAsync();
                await Task.WhenAll(sessionTask, companiesTask);

                var pagedResult = res;
                model = new HRApplyLeavePageViewModel
                {
                    Leaves = pagedResult.Success ? pagedResult.Data.Data : new List<HRApplyLeaveViewModel>(),
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

                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                // Step 3: Open the 'Setup' page for the user.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> ApplyLeave(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, int? staffId)
        {
            var model = new HRApplyLeavePageViewModel();
            try
            {
                model = await BuildApplyLeavePageViewModel(pageIndex, pageSize, search, companyId, sessionID,staffId);

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
        public async Task<IActionResult> GetApplyLeavePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,int? staffId)
        {
            try
            {
                var model = await BuildApplyLeavePageViewModel(pageIndex, pageSize, search, companyId, sessionID,staffId);

                return PartialView("_ApplyLeaveTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ApplyLeaveTablePartial", new HRApplyLeavePageViewModel());
            }
        }


        /// <summary>
        /// Shows the 'Approve Leave' page where administrators can see all staff leave requests and decide whether to approve or reject them.
        /// </summary>
        public async Task<IActionResult> ApproveLeaveold()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/ApproveLeave"
               );
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var model = new HRApplyLeavePageViewModel
                {
                    Leaves = (await _hrClient.GetAllApplyLeaveAsync()).Data,
                    StaffList = (await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId)).Data,
                    LeaveTypes = (await _hrClient.GetAllLeaveTypesAsync(sessionId, companyId)).Data
                };
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }

        }

        public async Task<HRApplyLeavePageViewModel> BuildApproveLeavePageViewModel(int? pageIndex,
     int? pageSize,
     string? search,
     int? companyId,
     int? sessionID,
     int? staffId)
        {
            var model = new HRApplyLeavePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/ApproveLeave"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    StaffId= staffId ?? GetStaffID(),
                };
                int userId = GetUserId();
                var sessionId = await GetSessionId();
                //var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                request.StaffId = staffId;
                // Step 1: Ask the system for all the job titles currently set up.
                var res = await _hrClient.GetAllApplyLeaveWithPageAsync(request);
                // Step 2: Prepare the list to be shown on the screen.
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyClient.GetAllAsync();
                await Task.WhenAll(sessionTask, companiesTask);

                var pagedResult = res;
                model = new HRApplyLeavePageViewModel
                {
                    Leaves = pagedResult.Success ? pagedResult.Data.Data : new List<HRApplyLeaveViewModel>(),
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

                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                // Step 3: Open the 'Setup' page for the user.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> ApproveLeave(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        int? staffId)
        {
            var model = new HRApplyLeavePageViewModel();
            try
            {
                model = await BuildApproveLeavePageViewModel(pageIndex, pageSize, search, companyId, sessionID, staffId);

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
        public async Task<IActionResult> GetApproveLeavePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID,
        int? staffId)
        {
            try
            {
                var model = await BuildApplyLeavePageViewModel(pageIndex, pageSize, search, companyId, sessionID, staffId);

                return PartialView("_ApproveLeaveTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ApproveLeaveTablePartial", new HRApplyLeavePageViewModel());
            }
        }

        public async Task<IActionResult> AddApproveLeave(int? id)
        {
            var perms = await GetPermissions("/HumanResource/ApproveLeave");
            int userId = GetUserId();
            var companyId = await GetCompanyId();
            var sessionId = await GetSessionId();

            var model = new HRApplyLeavePageViewModel
            {
                Leaves = (await _hrClient.GetAllApplyLeaveAsync()).Data,
                StaffList = (await _hrClient.GetAllStaffAsync(companyId, sessionId, null)).Data,
                LeaveTypes = (await _hrClient.GetAllLeaveTypesAsync(sessionId, companyId)).Data,
                Permissions = perms
            };

            if (id.HasValue && id.Value > 0)
            {
                var response = await _hrClient.GetApplyLeaveByIDAsync(id.Value);
                if (response.Success)
                {
                    model.EditApproveLeave = response.Data;
                }
            }

            return View(model);
        }


        [HttpPost("UpsertApproveLeave")]
        public async Task<IActionResult> UpsertApproveLeave([FromBody] HRLeaveTypeUpsertRequest req)
        {
            try
            {
                
                
                if(req.CompanyID==0 || req.CompanyID == null) 
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var res = await _hrClient.UpsertLeaveTypeAsync(req);

                return Ok(new
                {
                    success = res.Success,
                    message = res.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        public async Task<IActionResult> GetAllPayroll(int month,int year,int rollId)
        {
            int companyId = await GetCompanyId();
            int sessionId = await GetSessionId();
            var list =(await _hrClient.GetAllPayrollAsync(month, year, rollId)).Data;
            return Ok(new { success = true, data = list, debug_companyId = companyId, debug_sessionId = sessionId });
        }


        public async Task<IActionResult> DownloadStaffDocument(int id, string type)
        {
            
            var response = await _hrClient.GetStaffDocumentAsync(id, type);

            if (!response.Success)
                return NotFound();

            var bytes = await response.Data.Content.ReadAsByteArrayAsync();

            var contentType =
                response.Data.Content.Headers.ContentType?.MediaType
                ?? "application/octet-stream";

            var fileName =
                response.Data.Content.Headers.ContentDisposition?.FileName?.Trim('"')
                ?? "Document";

            if (bytes == null || bytes.Length == 0) return NotFound();
            return File(bytes, contentType, fileName);
        }

        public async Task<IActionResult> DownloadApplyLeaveDocument(int id)
        {
            
            var response = await _hrClient.GetApplyLeaveDocumentAsync(id);

            if (!response.Success)
                return NotFound();

            var bytes = await response.Data.Content.ReadAsByteArrayAsync();

            var contentType =
                response.Data.Content.Headers.ContentType?.MediaType
                ?? "application/octet-stream";

            var fileName =
                response.Data.Content.Headers.ContentDisposition?.FileName?.Trim('"')
                ?? "Attachment.pdf";
            if (bytes == null || bytes.Length == 0) return NotFound();
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// Shows the 'Payroll' page where administrators can manage staff salaries, bonuses, and deductions.
        /// </summary>
        public async Task<IActionResult> Payroll()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/Payroll"
               );
                var rolesRes = await _roleClient.GetAllRolesAsync();
                var model = new HRPayrollPageViewModel
                {
                    Roles = rolesRes.Success ? rolesRes.Data : new List<MstRoleViewModel>(),
                    SelectedMonth = DateTime.Now.Month,
                    SelectedYear = DateTime.Now.Year
                };
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }
            
        }

        public async Task<IActionResult> GeneratePayroll(int id, int month, int year)
        {
            var model =(await _hrClient.GetPayrollGenerationDataAsync(id, month, year,await GetCompanyId(), await GetSessionId())).Data;
            return View(model);
        }

        [SkipPermissionCheck]
        [HttpGet]
        public async Task<IActionResult> ImportStaff(int companyId, int sessionId)
        {
            if(companyId ==0 || companyId == null) 
            {
                companyId = await GetCompanyId();
            }
            if (sessionId == 0 || sessionId == null)
            {
                sessionId = await GetSessionId();
            }
            var rolesRes = await _roleClient.GetAllRolesAsync();
            ViewBag.Roles = rolesRes.Success ? rolesRes.Data : new List<MstRoleViewModel>();

            var desigRes = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
            ViewBag.Designations = desigRes.Success ? desigRes.Data : new List<HRDesignationViewModel>();

            var deptRes = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
            ViewBag.Departments = deptRes.Success ? deptRes.Data.Data : new List<HRDepartmentViewModel>();

            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ImportStaff(int roleId, int designationId, int departmentId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return Json(new { success = false, message = "Please select a CSV file." });

            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var userId = GetUserId();

                using var reader = new StreamReader(file.OpenReadStream());
                string? headerLine = await reader.ReadLineAsync();
                if (headerLine == null) return Json(new { success = false, message = "File is empty." });

                var headers = headerLine.Split(',').Select(h => h.Trim().ToLower()).ToList();
                var results = new List<object>();

                while (!reader.EndOfStream)
                {
                    string? line = await reader.ReadLineAsync();
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    // Simple CSV split (note: doesn't handle commas inside quotes, but standard for this project's samples)
                    var values = line.Split(',').Select(v => v.Trim()).ToList();
                    var req = new HRStaffUpsertRequest
                    {
                        StaffID = 0,
                        DesignationID = designationId,
                        DepartmentID = departmentId,
                        RoleIDs = new List<int> { roleId },
                        CompanyIDs = new List<int> { companyId },
                        IsActive = true,
                        UserTypeID = 2 // Defaulting to Staff user type, adjust if needed
                    };

                    for (int i = 0; i < headers.Count && i < values.Count; i++)
                    {
                        string header = headers[i];
                        string value = values[i];

                        switch (header)
                        {
                            case "employee_id": req.StaffCode = value; break;
                            case "name": req.FirstName = value; break;
                            case "surname": req.LastName = value; break;
                            case "father_name": req.FatherName = value; break;
                            case "mother_name": req.MotherName = value; break;
                            case "email": 
                                req.Email = value; 
                                req.Username = value; 
                                break;
                            case "dob": 
                                if (DateTime.TryParse(value, out var dob)) req.DOB = dob; 
                                break;
                            case "gender": req.Gender = value; break;
                            case "marital_status": req.MaritalStatus = value; break;
                            case "contact_no": 
                                req.MobileNo = value.Length > 10 ? value.Substring(0, 10) : value; 
                                break;
                            case "emergency_contact_no": 
                                req.EmergencyMobileNo = value.Length > 10 ? value.Substring(0, 10) : value; 
                                break;
                            case "date_of_joining": 
                                if (DateTime.TryParse(value, out var doj)) req.DOJ = doj; 
                                break;
                            case "local_address": req.CurrentAddress = value; break;
                            case "permanent_address": req.PermanentAddress = value; break;
                            case "qualification": req.Qualification = value; break;
                            case "work_exp": req.WorkExperience = value; break;
                            case "note": req.Note = value; break;
                            case "basic_salary": 
                                if (decimal.TryParse(value, out var salary)) req.BasicSalary = salary; 
                                break;
                            case "epf_no": req.EPFNo = value; break;
                            case "contract_type": req.ContractType = value; break;
                            case "shift": req.WorkShift = value; break;
                            case "location": req.WorkLocation = value; break;
                            case "bank_account_no": req.BankAccountNo = value; break;
                            case "bank_name": req.BankName = value; break;
                            case "ifsc_code": req.IFSCCode = value; break;
                            case "bank_branch": req.BankBranchName = value; break;
                            case "account_title": req.AccountTitle = value; break;
                            case "facebook": req.FacebookURL = value; break;
                            case "twitter": req.TwitterURL = value; break;
                            case "linkedin": req.LinkedinURL = value; break;
                            case "instagram": req.InstagramURL = value; break;
                        }
                    }

                    // Validation: Ensure mandatory fields are present
                    if (string.IsNullOrEmpty(req.FirstName) || string.IsNullOrEmpty(req.Username))
                    {
                        results.Add(new { staffCode = req.StaffCode, name = req.FirstName, success = false, message = "Missing mandatory fields (Name/Email)." });
                        continue;
                    }

                    req.CompanyId = await GetCompanyId();
                    req.SessionId = await GetSessionId();

                    var res = await _hrClient.UpsertStaffAsync(req);
                    results.Add(new
                    {
                        staffCode = req.StaffCode,
                        name = (req.FirstName + " " + req.LastName).Trim(),
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

        [HttpPost]
        public async Task<IActionResult> DeleteStaff([FromBody] List<int> id)
        {
            var res = await _hrClient.DeleteStaffAsync(id);
            return Json(new { success = true, message = res.Message });
        }
        [HttpPost]
        public async Task<IActionResult> DeleteApplyLeave([FromBody] List<int> id)
        {
            var res = await _hrClient.DeleteApplyLeaveAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }
        [HttpPost]
        public async Task<IActionResult> DeleteLeaveType([FromBody] List<int> id)
        {
            var res = await _hrClient.DeleteLeaveTypeAsync(id);
            return Json(new { success =true, message = res.Message });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteDepartment([FromBody] List<int> id)
        {
            var res = await _hrClient.DeleteDepartmentAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }
        [HttpPost]
        public async Task<IActionResult> DeleteDesignation([FromBody] List<int> id)
        {
            var res = await _hrClient.DeleteDesignationAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }
        
        [HttpPost("UpdateDepartment")]
        public async Task<IActionResult> UpdateDepartment([FromBody] HRDepartmentUpsertRequest req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                req.SessionID = await GetSessionId();
                var isCreate = req.DepartmentID <= 0;
                var res = await _hrClient.UpsertDepartmentAsync(req);
                return Ok(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }

        }

        [HttpPost("UpsertDesignation")]
        public async Task<IActionResult> UpsertDesignation([FromBody] HRDesignationUpsertRequest req)
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
                var res = await _hrClient.UpsertDesignationAsync(req);
                return Ok(new { success = res.Success, message = res.Message });
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost("UpsertStaff")]
        public async Task<IActionResult> UpsertStaff([FromBody] HRStaffUpsertRequest req)
        {
            try
            {
                if (req.CompanyId == 0 || req.CompanyId == null)
                {
                    req.CompanyId = await GetCompanyId();
                }
                if (req.SessionId == 0 || req.SessionId == null)
                {
                    req.SessionId = await GetSessionId();
                }
                var isCreate = req.StaffID <= 0;
                var res = await _hrClient.UpsertStaffAsync(req);
                if (res.Success)
                {
                    int staffid = res.Data.Result;
                    if (!string.IsNullOrEmpty(req.PhotoBase64) && !string.IsNullOrWhiteSpace(req.PhotoBase64))
                    {
                        var photoResult = await _photoService.SaveBase64PhotoAsync(
                                        req.PhotoBase64,
                                        req.PhotoDocName ?? "photo.jpg",
                                        PhotoModule.Staff,
                                        FolderNameModule.Profile,
                                        req.StaffID
                                    );
                        if (photoResult.Success)
                        {
                            var model = new ProfileRequest();
                            model.Id = req.StaffID;
                            model.PhotoDoc = photoResult.PhotoUrl;
                            await _hrClient.UpdateProfileAsync(model);
                        } 
                    }
                }
                return Ok(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }

        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost("UpsertLeaveType")]
        public async Task<IActionResult> UpsertLeaveType([FromBody] HRLeaveTypeUpsertRequest req)
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
                var res = await _hrClient.UpsertLeaveTypeAsync(req);
                return Ok(new { success = res.Success, message = res.Message });
            }
            catch (Exception)
            {
                throw;
            }
        }



        [HttpPost]
        public async Task<IActionResult> ToggleDesignationStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _hrClient.ToggleDesignationStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }


        [HttpPost]
        public async Task<IActionResult> ToggleDepartmentStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _hrClient.ToggleDepartmentStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        [HttpPost]
        public async Task<IActionResult> ToggleLeaveTypeStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _hrClient.ToggleLeaveTypeStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        [HttpGet]
        public async Task<IActionResult> GetLeaveBalance(int leaveTypeId, int staffId)
        {
            try
            {
                var response = await _hrClient.GetLeaveTypeWiseBalanceAsync(leaveTypeId, staffId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> UpsertApplyLeave([FromBody] HRApplyLeaveUpsertRequest req)
        {
            try
            {
                if (req.ApplyLeaveID > 0)
                {
                    var existing = await _hrClient.GetApplyLeaveByIDAsync(req.ApplyLeaveID);
                    if (existing != null && !string.Equals(existing.Data?.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                    {
                        return Ok(new
                        {
                            success = false,
                            message = $"This leave application has already been {existing.Data?.Status} and cannot be modified."
                        });
                    }
                }

                if (req.CompanyID == 0) req.CompanyID = await GetCompanyId();
                if (req.SessionID == 0) req.SessionID = await GetSessionId();

                var res = await _hrClient.UpsertApplyLeaveAsync(req);
                return Ok(new { success = res.Success, message = res.Message });
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStaffAttendance(DateTime date, int roleId)
        {
            try
            {
                var response = await _hrClient.GetStaffAttendanceAsync(date, roleId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<HRStaffAttendancePageViewModel> BuildStaffAttendancePageViewModel(DateTime? date,
        int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? roleId)
        {

            var model = new HRStaffAttendancePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Attendance/Attendance"
               );

                var request = new HRStaffAttendanceSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchText = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionId ?? await GetSessionId(),
                    RoleID = roleId ?? GetRoleId(),
                    AttendanceDate = date ?? DateTime.Now
                };
                var staffID = GetStaffID();
                if (staffID == null || staffID == 0)
                {
                    staffID = GetStaffID();
                    staffID = (staffID ?? 0) <= 0 ? null : staffID;
                }
                if (roleId == null || roleId == 0)
                {
                    roleId = GetRoleId();
                    roleId = (roleId ?? 0) <= 0 ? null : roleId;
                    request.RoleID = roleId;
                }
                //var sessionId = await GetSessionId();
                var classesResponse = _hrClient.GetAllStaffAttendanceWithPageAsync(request);
                var companiesTask = _companyClient.GetAllAsync();
                var sessionTask = _sessionService.GetAllAsync(false,request.CompanyID);
                var res = await _roleClient.GetAllRolesAsync();
                await Task.WhenAll(classesResponse, companiesTask, sessionTask);

                var pagedResult = await classesResponse;

                model = new HRStaffAttendancePageViewModel
                {
                    StaffAttendance = pagedResult.Success ? pagedResult.Data.Data : new List<HRStaffAttendanceViewModel>(),
                    Roles = res.Data ?? new(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionID = request.SessionID,
                    RoleID = request.RoleID,
                    AttendanceDate = request.AttendanceDate

                };

                if (roleId != 0 && roleId !=null)
                {
                    if (staffID != null) 
                    {
                        var backdateCount = await _backDateSettingService.GetBackDateCountAsync(request.CompanyID, staffID.Value, request.RoleID.Value);
                        model.BackDateCount = backdateCount.Data;
                    }
                   
                }
                else
                {
                    model.BackDateCount = 0;
                }
                model.Permissions = perms;
                return model;

            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }


        public async Task<IActionResult> StaffAttendance(DateTime? date,
        int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? roleId)
        {
            var model = new HRStaffAttendancePageViewModel();
            try
            {
                model = await BuildStaffAttendancePageViewModel(date,
                   pageIndex, pageSize, search, companyId, sessionId, roleId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetAttendancePartial(DateTime? date,
        int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? roleId)
        {
            var model = new HRStaffAttendancePageViewModel();
            try
            {
                model = await BuildStaffAttendancePageViewModel(date,
                   pageIndex, pageSize, search, companyId, sessionId, roleId);

                return PartialView("_StaffAttendanceTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }


        [HttpPost]
        public async Task<IActionResult> SaveAttendance([FromBody] HRStaffAttendanceUpsertRequestModel req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                req.SessionId = await GetSessionId();
                var result = await _hrClient.SaveStaffAttendanceAsync(req);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStaffAttendanceSummary(int? year, int? staffId, int? status)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var role = User.FindFirst("UserTypeName")?.Value;                
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }

                var res = await _hrClient.GetStaffAttendanceSummaryAsync(companyId, sessionId, staffId.Value, year, status);

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
        public async Task<IActionResult> DeleteTimeline(int id)
        {
            try
            {
                var result = await _hrClient.DeleteTimelineAsyc(id);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Database Error: " + ex.Message });
            }
        }

        public async Task<IActionResult> AddStaffTimeline(int? id,int? staffId)
        {
            var model = new AddStaffTimelineTimelineViewModel(); //StudentHouseViewModel
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                    "/StudentInformation/Add"
                );
                // Step 1: Initialize a new blank page model.

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _hrClient.GetTimelineByIDsync(id.Value);
                    if (response.Success)
                    {
                        model.EditStaffTimeline = response.Data;
                    }
                }
                else
                {
                    model.EditStaffTimeline = null;
                }
                model.StaffID = staffId.Value;
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
        public async Task<IActionResult> UpsertTimeline([FromForm] HRStaffTimelineUpsertRequest req, IFormFile? attachmentFile)
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

                    req.AttachDocName = attachmentFile.FileName;
                    req.AttachDocType = attachmentFile.ContentType;

                }

                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }

                var r = await _hrClient.UpsertTimelineAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? timelineID = r.Data.Result.TimelineID;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.AttachDocName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.AttachDocName ?? "photo.jpg",
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
                            var attachment = await _hrClient.UpsertStaffTimelineAttachmentFileAsync(attchment);
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

        [HttpPost]
        public async Task<IActionResult> ToggleStaffStatus([FromBody] HRStaffStatusToggleRequest request)
        {
            try
            {
                var response = await _hrClient.ToggleStaffStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ChangeStaffPassword([FromBody] HRStaffChangePasswordRequest request)
        {
            try
            {
                var response = await _hrClient.ChangeStaffPasswordAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpGet]
        public async Task<IActionResult> GetAllStaff()
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

                var response = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> SaveDetailedPayroll([FromBody] HRPayrollSaveRequest req)
        {
            try
            {
                var result = await _hrClient.SaveDetailedPayrollAsync(req);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PayPayroll([FromBody] HRPayrollPaymentRequest req)
        {
            try
            {
                var result = await _hrClient.PayPayrollAsync(req);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> GetPayrollDetails(int id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/HumanResource/GetPayrollDetails"
               );
                var rolesRes = await _hrClient.GetPayrollDetailsAsync(id);
                return Json(new { success = rolesRes.Success,data= rolesRes.Data, message = rolesRes.Message });
            }
            catch (Exception)
            {

                throw;
            }

        }
    }
}
