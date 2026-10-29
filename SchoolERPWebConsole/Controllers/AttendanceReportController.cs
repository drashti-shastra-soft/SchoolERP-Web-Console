using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    /// <summary>
     /// Controller for generating various attendance reports for students and staff.
     /// </summary>
    public class AttendanceReportController : BaseController
    {
        private readonly IAttendanceClientServiceReport _client;
        private readonly IStudentInformationClientService _studentService;
        private readonly IClassClientService _classService;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IHostelClientService _hostelClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly IRoleClientService _roleClient;
        public AttendanceReportController(IAttendanceClientServiceReport client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IStudentInformationClientService studentService
            , IClassClientService classService, IHostelClientService hostelClient, IHumanResourceClientService hrClient,
            IRoleClientService roleClient) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _studentService = studentService;
            _classService = classService;
            _hostelClient = hostelClient;
            _hrClient = hrClient;
            _roleClient = roleClient;
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
        /// <summary>
        /// Gets the staff ID from user claims if available.
        /// </summary>
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        /// <summary>
        /// Gets the role ID from user claims if available.
        /// </summary>
        private int? GetRoleId()
        {
            var roleIdClaim = User.FindFirst("RoleId")?.Value;
            int.TryParse(roleIdClaim, out int roleId);
            return roleId; // returns 0 if claim missing or invalid
        }


        #region Attendance Monthly Report
        /// <summary>
        /// Builds the view model for the student attendance monthly report.
        /// </summary>
        private async Task<AttendanceMonthlyReportPageViewModel> BuildAttendanceMonthlyReportViewModel(AttendanceMonthlyReportRequest request)
        {
            var model = new AttendanceMonthlyReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/AttendanceMonthlyReport");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // Default to current month/year on first load
                if (request.Month <= 0) request.Month = DateTime.Today.Month;
                if (request.Year <= 0) request.Year = DateTime.Today.Year;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetAttendanceMonthlyReportAsync(request);
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);
                await Task.WhenAll(reportTask, classesTask);
                var pagedResult = await reportTask;

                var students = pagedResult.Success ? pagedResult.Data?.Data ?? new List<AttendanceMonthlyResponse>()
                                                    : new List<AttendanceMonthlyResponse>();
                var days = pagedResult.Success ? pagedResult.Data?.Days ?? new List<AttendanceHolidayResponse>()
                                                : new List<AttendanceHolidayResponse>();

                // If the SP returned no calendar (e.g. zero-student page still
                // returns it, but guard anyway), fall back to building D01..D(last)
                // locally so the header always renders for the requested month.
                if (days.Count == 0)
                {
                    var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
                    days = Enumerable.Range(1, daysInMonth).Select(d =>
                    {
                        var date = new DateTime(request.Year, request.Month, d);
                        return new AttendanceHolidayResponse
                        {
                            DAYCOL = "D" + d.ToString("00"),
                            CALDATE = date,
                            WEEKDAYNAME = date.DayOfWeek.ToString(),
                            ISHOLIDAY = 0,
                            HOLIDAYNAME = null
                        };
                    }).ToList();
                }

                model = new AttendanceMonthlyReportPageViewModel
                {
                    Students = students,
                    Days = days,
                    DayColumns = days.Select(d => d.DAYCOL).ToList(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    TotalPages = pagedResult.Data?.TotalPages ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    Month = request.Month,
                    Year = request.Year,
                    StudentId = request.StudentId,
                    SearchKeyword = request.SearchKeyword,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    Permissions = perms,
                    ClassList = (await classesTask).Data ?? new(),
                    // SectionList = await GetSectionListAsync(companyId, sessionId, request.ClassId),
                };

                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }
        /// <summary>
        /// Displays the student attendance monthly report page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> AttendanceMonthlyReport(AttendanceMonthlyReportRequest request)
        {
            var model = new AttendanceMonthlyReportPageViewModel();
            try
            {
                model = await BuildAttendanceMonthlyReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the student attendance monthly report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAttendanceMonthlyReportPartial(AttendanceMonthlyReportRequest request)
        {
            try
            {
                var model = await BuildAttendanceMonthlyReportViewModel(request);
                return PartialView("_AttendanceMonthlyReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AttendanceMonthlyReportTablePartial", new AttendanceMonthlyReportPageViewModel());
            }
        }

        #endregion

        #region Student Attendance Type Report
        /// <summary>
        /// Builds the view model for the student attendance type report.
        /// </summary>
        private async Task<AttendanceTypeReportPageViewModel> BuildStudentAttendanceTypeReportViewModel(StudentReportRequest request)
        {
            var model = new AttendanceTypeReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // FIX: removed the dead double-call to GetStaffID() that computed a value
                // never used anywhere below. If staffId is meant to scope the report
                // (e.g. restrict results to the logged-in staff member), wire it into
                // `request` here before calling GetStaffReportAsync. Otherwise this
                // block can be deleted entirely.
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                // e.g.: if (staffId.HasValue) request.StaffId = staffId;

                var reportTask = _client.GetAttendanceTypeReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);
                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new AttendanceTypeReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<AttendanceTypeReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    ClassList = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo,
                    ClassId=request.ClassId,
                    SectionID=request.SectionId,
                    AttendanceType=request.AttendanceType
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
        /// Displays the student attendance type report page.
        /// </summary>
        public async Task<IActionResult> StudentAttendanceTypeReport(StudentReportRequest request)
        {
            var model = new AttendanceTypeReportPageViewModel();
            try
            {
                model = await BuildStudentAttendanceTypeReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the student attendance type report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentAttendanceTypePartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentAttendanceTypeReportViewModel(request);
                return PartialView("_StudentAttendanceTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentAttendanceTypeTablePartial", new AttendanceTypeReportPageViewModel());
            }
        }


        #endregion

        #region Student Attendance Type Report
        /// <summary>
        /// Builds the view model for the student attendance daily report.
        /// </summary>
        private async Task<AttendanceDailyReportPageViewModel> BuildStudentAttendanceDailyReportViewModel(StudentReportRequest request)
        {
            var model = new AttendanceDailyReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // FIX: removed the dead double-call to GetStaffID() that computed a value
                // never used anywhere below. If staffId is meant to scope the report
                // (e.g. restrict results to the logged-in staff member), wire it into
                // `request` here before calling GetStaffReportAsync. Otherwise this
                // block can be deleted entirely.
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                // e.g.: if (staffId.HasValue) request.StaffId = staffId;

                var reportTask = _client.GetAttendanceDailyReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);
                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new AttendanceDailyReportPageViewModel
                {
                    AttendanceDaily = pagedResult.Success ? pagedResult.Data.Data : new List<AttendanceDailyReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    ClassList = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo,
                    ClassId = request.ClassId,
                    SectionID = request.SectionId,
                    AttendanceType = request.AttendanceType
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
        /// Displays the student attendance daily report page.
        /// </summary>
        public async Task<IActionResult> StudentAttendanceDailyReport(StudentReportRequest request)
        {
            var model = new AttendanceDailyReportPageViewModel();
            try
            {
                model = await BuildStudentAttendanceDailyReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the student attendance daily report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentAttendanceDailyPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentAttendanceDailyReportViewModel(request);
                return PartialView("_StudentAttendanceDailyTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentAttendanceDailyTablePartial", new AttendanceDailyReportPageViewModel());
            }
        }


        #endregion

        #region Student Attendance Type Report
        /// <summary>
        /// Builds the view model for the student attendance day-wise report.
        /// </summary>
        private async Task<AttendanceDayWiseReportPageViewModel> BuildStudentAttendanceDayWiseReportViewModel(StudentReportRequest request)
        {
            var model = new AttendanceDayWiseReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // FIX: removed the dead double-call to GetStaffID() that computed a value
                // never used anywhere below. If staffId is meant to scope the report
                // (e.g. restrict results to the logged-in staff member), wire it into
                // `request` here before calling GetStaffReportAsync. Otherwise this
                // block can be deleted entirely.
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                // e.g.: if (staffId.HasValue) request.StaffId = staffId;

                var reportTask = _client.GetAttendanceDailyWiseReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);
                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new AttendanceDayWiseReportPageViewModel
                {
                    AttendanceDayWise = pagedResult.Success ? pagedResult.Data.Data : new List<AttendanceDayWiseReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    ClassList = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo,
                    ClassId = request.ClassId,
                    SectionID = request.SectionId,
                    AttendanceType = request.AttendanceType
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
        /// Displays the student attendance day-wise report page.
        /// </summary>
        public async Task<IActionResult> StudentAttendanceDayWiseReport(StudentReportRequest request)
        {
            var model = new AttendanceDayWiseReportPageViewModel();
            try
            {
                model = await BuildStudentAttendanceDayWiseReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the student attendance day-wise report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentAttendanceDayWisePartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentAttendanceDayWiseReportViewModel(request);
                return PartialView("_StudentAttendanceDayWiseTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentAttendanceDayWiseTablePartial", new AttendanceDayWiseReportPageViewModel());
            }
        }


        #endregion

        #region Attendance Monthly Report
        /// <summary>
        /// Builds the view model for the staff attendance monthly report.
        /// </summary>
        private async Task<AttendanceMonthlyReportPageViewModel> BuildAttendanceStaffMonthlyReportViewModel(AttendanceMonthlyReportRequest request)
        {
            var model = new AttendanceMonthlyReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/AttendanceMonthlyReport");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // Default to current month/year on first load
                if (request.Month <= 0) request.Month = DateTime.Today.Month;
                if (request.Year <= 0) request.Year = DateTime.Today.Year;
                var staffID = GetStaffID();
                if (staffID == null || staffID == 0)
                {
                    staffID = GetStaffID();
                    staffID = (staffID ?? 0) <= 0 ? null : staffID;
                }
                var roleId = GetRoleId();
                if (roleId == null || roleId == 0)
                {
                    roleId = GetRoleId();
                    roleId = (roleId ?? 0) <= 0 ? null : roleId;
                    request.RoleId = roleId;
                }
                var reportTask = _client.GetAttendanceStaffMonthlyReportAsync(request);
                var rolesTask = _roleClient.GetAllRolesAsync();
                await Task.WhenAll(reportTask, rolesTask);
                var pagedResult = await reportTask;

                var staffs = pagedResult.Success ? pagedResult.Data?.Data ?? new List<AttendanceStaffMonthlyResponse>()
                                                    : new List<AttendanceStaffMonthlyResponse>();
                var days = pagedResult.Success ? pagedResult.Data?.Days ?? new List<AttendanceHolidayResponse>()
                                                : new List<AttendanceHolidayResponse>();

                // If the SP returned no calendar (e.g. zero-student page still
                // returns it, but guard anyway), fall back to building D01..D(last)
                // locally so the header always renders for the requested month.
                if (days.Count == 0)
                {
                    var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
                    days = Enumerable.Range(1, daysInMonth).Select(d =>
                    {
                        var date = new DateTime(request.Year, request.Month, d);
                        return new AttendanceHolidayResponse
                        {
                            DAYCOL = "D" + d.ToString("00"),
                            CALDATE = date,
                            WEEKDAYNAME = date.DayOfWeek.ToString(),
                            ISHOLIDAY = 0,
                            HOLIDAYNAME = null
                        };
                    }).ToList();
                }

                model = new AttendanceMonthlyReportPageViewModel
                {
                    Staffs = staffs,
                    Days = days,
                    DayColumns = days.Select(d => d.DAYCOL).ToList(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    TotalPages = pagedResult.Data?.TotalPages ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    Month = request.Month,
                    Year = request.Year,
                    StudentId = request.StudentId,
                    SearchKeyword = request.SearchKeyword,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    Permissions = perms,
                    Roles = (await rolesTask).Data ?? new(),
                    RoleID = request.RoleId,
                    // SectionList = await GetSectionListAsync(companyId, sessionId, request.ClassId),
                };

                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }
        /// <summary>
        /// Displays the staff attendance monthly report page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> AttendanceStaffMonthlyReport(AttendanceMonthlyReportRequest request)
        {
            var model = new AttendanceMonthlyReportPageViewModel();
            try
            {
                model = await BuildAttendanceStaffMonthlyReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the staff attendance monthly report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAttendanceStaffMonthlyReportPartial(AttendanceMonthlyReportRequest request)
        {
            try
            {
                var model = await BuildAttendanceStaffMonthlyReportViewModel(request);
                return PartialView("_AttendanceStaffMonthlyReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AttendanceStaffMonthlyReportTablePartial", new AttendanceMonthlyReportPageViewModel());
            }
        }

        #endregion

        #region Student Attendance Type Report
        /// <summary>
        /// Builds the view model for the staff attendance day-wise report.
        /// </summary>
        private async Task<StaffAttendanceDayWiseReportPageViewModel> BuildStaffAttendanceDayWiseReportViewModel(StudentReportRequest request)
        {
            var model = new StaffAttendanceDayWiseReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");
                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;

                // FIX: removed the dead double-call to GetStaffID() that computed a value
                // never used anywhere below. If staffId is meant to scope the report
                // (e.g. restrict results to the logged-in staff member), wire it into
                // `request` here before calling GetStaffReportAsync. Otherwise this
                // block can be deleted entirely.
                var staffId = GetStaffID();
                staffId = (staffId ?? 0) <= 0 ? null : staffId;
                // e.g.: if (staffId.HasValue) request.StaffId = staffId;
                var roleId = GetRoleId();
                if(request.RoleID ==null || request.RoleID == 0) 
                {
                    if (roleId == null || roleId == 0)
                    {
                        roleId = GetRoleId();
                        roleId = (roleId ?? 0) <= 0 ? null : roleId;
                        request.RoleID = roleId;
                    }
                }
                
                var reportTask = _client.GetStaffAttendanceDayWiseReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var rolesTask = _roleClient.GetAllRolesAsync();
                await Task.WhenAll(reportTask, sessionTask, companiesTask, rolesTask);

                var pagedResult = await reportTask;

                model = new StaffAttendanceDayWiseReportPageViewModel
                {
                    AttendanceDayWise = pagedResult.Success ? pagedResult.Data.Data : new List<StaffAttendanceDayWiseReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Roles = (await rolesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo,
                    RoleId = request.RoleID,
                    SectionID = request.SectionId,
                    AttendanceType = request.AttendanceType
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
        /// Displays the staff attendance day-wise report page.
        /// </summary>
        public async Task<IActionResult> StaffAttendanceDayWiseReport(StudentReportRequest request)
        {
            var model = new StaffAttendanceDayWiseReportPageViewModel();
            try
            {
                model = await BuildStaffAttendanceDayWiseReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the staff attendance day-wise report table (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStaffAttendanceDayWisePartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStaffAttendanceDayWiseReportViewModel(request);
                return PartialView("_StaffAttendanceDayWiseTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StaffAttendanceDayWiseTablePartial", new StaffAttendanceDayWiseReportPageViewModel());
            }
        }


        #endregion
    }
}
