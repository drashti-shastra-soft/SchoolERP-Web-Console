using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the main dashboard, which gives you a quick overview of the whole system's status.
    /// </summary>
    public class DashboardController : BaseController
    {
        private readonly IUtilityClientService _utilityClient;
        private readonly ICompanyClientService _companyClient;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IAttendanceClientService _serviceattendance;
        private readonly IFrontOfficeClientService _serviceFrontOffice;
        private readonly ILibraryBudgetClientService _client;
        private readonly IUserClientService _userClient;
        private readonly IAcademicsClientService _academicsService;
        private readonly ISubjectClientService _subjectService;
        private readonly IHomeworkClientService _homeworkClient;
        private readonly IHumanResourceClientService _humanResourceClientService;
        private readonly ITeacherDashboardClientService _teacherDashboardClientService;

        public DashboardController(IUtilityClientService utilityClient, IUserClientService userClient, ILibraryBudgetClientService client, ICompanyClientService companyClient, IAcademicsClientService academicsService, IFrontOfficeClientService frontOffice, IAttendanceClientService attendance, ISessionClientService sessionClient, ISubjectClientService subjectService ,ICompanyClientService companyService, IHomeworkClientService homeworkClient, ITeacherDashboardClientService teacherDashboardClientService, IHumanResourceClientService humanResourceClientService, PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _userClient = userClient;
            _serviceattendance = attendance;
            _utilityClient = utilityClient;
            _companyClient = companyClient;
            _sessionClient = sessionClient;
            _companyService = companyService;
            _serviceFrontOffice = frontOffice;
            _academicsService = academicsService;
            _subjectService = subjectService;
            _homeworkClient = homeworkClient;
            _humanResourceClientService = humanResourceClientService;
            _teacherDashboardClientService = teacherDashboardClientService;
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

        /// <summary>
        /// Shows the main dashboard page, providing high-level summaries like the total number of companies registered.
        /// </summary>
        //public async Task<IActionResult> Index()
        //{
        //    var model = new DashboardPageViewModel();
        //    try
        //    {
        //        // Step 1: Ask the system for a list of all schools or companies registered.
        //        var companiesResponse = await _companyClient.GetAllAsync();
        //        var req = new ReqAttendanceCountModel
        //        {
        //            CompanyId = await GetCompanyId(),
        //            SessionId = await GetSessionId(),
        //            AttendanceStatus = 1, // Indicates the student is Present
        //            AttendanceDate = DateTime.Today
        //        };
        //        var totalAttandance = await _companyClient.GetStudentAttendanceCountAsync(req);
        //        if (totalAttandance != null)
        //        {
        //            model.AttendanceCountModel = totalAttandance.Data;
        //        }
        //        var userRoleWiseCount = await _companyClient.GetUserRoleWiseCountAsync(await GetCompanyId(), await GetSessionId());
        //        if (userRoleWiseCount != null)
        //        {
        //            model.UserRoleWiseCountModel = userRoleWiseCount.Data;
        //        }
        //        // Step 2: Count how many companies were found and save that number to show on the dashboard screen.
        //        ViewBag.totalCompanies = companiesResponse.Data.Count();

        //        // Step 3: Open the dashboard page for the user to see.
        //        return View(model);
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return View(model);
        //    }

        //}


        public async Task<IActionResult> Index()
        {
            var userTypeName = User.FindFirst("UserTypeName")?.Value?.ToLower().Trim();

            // Redirect to role-specific dashboard
            if (userTypeName == "student")
                return RedirectToAction("Student");

            if (userTypeName == "parent")
                return RedirectToAction("Parent");

            if (userTypeName == "teacher" || userTypeName == "staff" || userTypeName == "HR")
                return RedirectToAction("Teacher");

            if (userTypeName == "admin")
                return RedirectToAction("Admin");

           


            var model = new DashboardPageViewModel();
            try
            {
                var companiesResponse = await _companyClient.GetAllAsync();
                var req = new ReqAttendanceCountModel
                {
                    CompanyId = await GetCompanyId(),
                    SessionId = await GetSessionId(),
                    AttendanceStatus = 1,
                    AttendanceDate = DateTime.Today
                };

                var totalAttandance = await _companyClient.GetStudentAttendanceCountAsync(req);
                if (totalAttandance != null)
                    model.AttendanceCountModel = totalAttandance.Data;

                var userRoleWiseCount = await _companyClient.GetUserRoleWiseCountAsync(
                    await GetCompanyId(), await GetSessionId());
                if (userRoleWiseCount != null)
                    model.UserRoleWiseCountModel = userRoleWiseCount.Data;

                ViewBag.totalCompanies = companiesResponse.Data.Count();

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        #region Admin Dashboard
        [SkipPermissionCheck]
        public async Task<IActionResult> Admin()
        {
            var companiesResponse = await _companyClient.GetAllAsync();
            ViewBag.totalCompanies = companiesResponse.Data.Count();
            return View();
        }
        #endregion

        #region Parent Dashboard
        [SkipPermissionCheck]
        public async Task<IActionResult> Parent()
        {
            var companiesResponse = await _companyClient.GetAllAsync();
            ViewBag.totalCompanies = companiesResponse.Data.Count();
            return View();
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetTeacherTimetable()
        {
            var response = await _teacherDashboardClientService.GetTimetableAsync();
            return Json(new { success = response?.Success ?? false, data = response?.Data });
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetTeacherStudents()
        {
            var response = await _teacherDashboardClientService.GetStudentsAsync();
            return Json(new { success = response?.Success ?? false, data = response?.Data });
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetTeacherHomework()
        {
            var response = await _teacherDashboardClientService.GetHomeworkAsync();
            return Json(new { success = response?.Success ?? false, data = response?.Data });
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetTeacherHWSubmissions()
        {
            var response = await _teacherDashboardClientService.GetHWSubmissionsAsync();
            return Json(new { success = response?.Success ?? false, data = response?.Data });
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetTeacherAttendance()
        {
            var response = await _teacherDashboardClientService.GetAttendanceAsync();
            return Json(new { success = response?.Success ?? false, data = response?.Data });
        }
        #endregion

        #region Teacher Dashboard
        [SkipPermissionCheck]
        public async Task<IActionResult> Teacher()
        {
            var companiesResponse = await _companyClient.GetAllAsync();
            ViewBag.totalCompanies = companiesResponse.Data.Count();
            return View();
        }
        #endregion

        #region Student Dashboard

        [SkipPermissionCheck]
        public async Task<IActionResult> Student()
        {
            var companiesResponse = await _companyClient.GetAllAsync();
            ViewBag.totalCompanies = companiesResponse.Data.Count();
            return View();
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetSubjectListForDashboard()
        {
            try
            {
                var request = new SubjectSearchRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId(),
                    PageNumber = 1,
                    PageSize = 10
                };

                var response = await _subjectService.GetSubjectListForDashboardAsync(request);

                if (response?.Data?.Data == null || !response.Data.Data.Any())
                    return Json(new { success = false, message = "No subjects found" });

                var subjects = response.Data.Data.Select(s => new
                {
                    name = s.SubjectName,
                    code = s.SubjectCode,
                    type = s.SubjectType,
                    isActive = s.IsActive
                }).ToList();

                return Json(new
                {
                    success = true,
                    data = subjects,
                    total = response.Data.TotalRecords
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetHomeworkSubmissionDashboard()
        {
            try
            {
                var response = await _homeworkClient.GetHomeworkSubmissionDashboardAsync();

                return Json(new
                {
                    success = response?.Success ?? false,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        [SkipPermissionCheck]
        public async Task<IActionResult> GetHomeworkDashboard()
        {
            try
            {
                var response = await _homeworkClient.GetHomeworkDashboardAsync();
                return Json(new
                {
                    success = response?.Success ?? false,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        [SkipPermissionCheck]
        public async Task<IActionResult> GetVisitorDashboard()
        {
            try
            {
                var response = await _serviceFrontOffice.GetVisitorDashboardAsync();
                return Json(new
                {
                    success = response?.Success ?? false,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        [SkipPermissionCheck]
        public async Task<IActionResult> GetStaffDashboard()
        {
            try
            {
                var response = await _humanResourceClientService.GetStaffDashboardAsync();
                return Json(new
                {
                    success = response?.Success ?? false,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region SuperAdmin
        /// <summary>
        /// Returns the count of students present today (vs total students) for the dashboard "Present Today" card.
        /// Called via AJAX so the count loads independently of the main dashboard render.
        /// </summary>
        [SkipPermissionCheck]
        public async Task<IActionResult> GetPresentStudentCount()
        {
            try
            {
                var req = new ReqAttendanceCountModel
                {
                    CompanyId = await GetCompanyId(),
                    SessionId = await GetSessionId(),
                    AttendanceStatus = 1, // Indicates the student is Present
                    AttendanceDate = DateTime.Today
                };

                var response = await _serviceattendance.GetPresentStudentCountAsync(req);

                return Json(new
                {
                    success = response != null,
                    data = response?.Data
                });
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
        [SkipPermissionCheck]
        public async Task<IActionResult> GetPresentStaffCount()
        {
            try
            {
                var req = new ReqAttendanceCountModel
                {
                    CompanyId = await GetCompanyId(),
                    SessionId = await GetSessionId(),
                    AttendanceDate = DateTime.Today
                };

                var response = await _serviceattendance.GetPresentStaffCountAsync(req);

                return Json(new
                {
                    success = response != null,
                    data = response?.Data
                });
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

        [SkipPermissionCheck]
        public async Task<IActionResult> GetInquiryStatusCount()
        {
            try
            {
                var enquiryReq = new InquiryStatusCountRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId()
                };

                var response = await _serviceFrontOffice.GetInquiryStatusCountAsync(enquiryReq);

                return Json(new
                {
                    success = response != null,
                    data = response?.Data
                });
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


        [SkipPermissionCheck]
        public async Task<IActionResult> GetLibraryBudgetChartData()
        {
            try
            {
                var request = new SearchRequest
                {
                    CompanyID = await GetCompanyId(),
                    PageNumber = 1,
                    PageSize = 100
                };

                var response = await _client.GetLibraryBudgetChartDataAsync(request);

                if (response?.Data?.Data == null || !response.Data.Data.Any())
                    return Json(new { success = false });

                var budgets = response.Data.Data;

                // BudgetId as bar value (unique number per budget)
                var chartData = new
                {
                    labels = budgets.Select(b => b.BudgetName).ToArray(),
                    displayLabel = budgets.Select(b => b.DisplayLabel).ToArray(),
                    acronym = budgets.Select(b => b.Acronym).ToArray(),
                    budgetIds = budgets.Select(b => b.BudgetId).ToArray(),
                    totalCount = response.Data.TotalRecords
                };

                return Json(new { success = true, data = chartData });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [SkipPermissionCheck]
        public async Task<IActionResult> GetPhoneCallLogChartData()
        {
            try
            {
                var request = new SearchRequest
                {
                    CompanyID = await GetCompanyId(),
                    SessionID = await GetSessionId()
                };

                var response = await _serviceFrontOffice.GetPhoneCallLogChartDataAsync(request);

                return Json(new
                {
                    success = response != null,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        [SkipPermissionCheck]
        public async Task<IActionResult> GetUserTypeWiseCount()
        {
            try
            {
                var companyId = await GetCompanyId();
                var response = await _userClient.GetUserTypeWiseCountAsync(companyId);

                return Json(new
                {
                    success = response != null,
                    data = response?.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        #endregion

    }
}
