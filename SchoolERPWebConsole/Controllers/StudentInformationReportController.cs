using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;

namespace SchoolERPWebClient.Controllers
{
    public class StudentInformationReportController : BaseController
    {
        private readonly IStudentInformationReportClientService _client;
        private readonly IStudentInformationClientService _studentService;
        private readonly IClassClientService _classService;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IHostelClientService _hostelClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly IRoleClientService _roleClient;
        public StudentInformationReportController(IStudentInformationReportClientService client,
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
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }

        #region Student Details Reports
        private async Task<StudentInformationReportPageViewModel> BuildStudentReportPageViewModel(StudentReportRequest request)
        {
            var model = new StudentInformationReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetStudentReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature
                var categoriesTask = _studentService.GetAllStudentCategories(sessionId, companyId, true);                   // ASSUMPTION: adjust to your actual service name

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask, categoriesTask);

                var pagedResult = await reportTask;

                model = new StudentInformationReportPageViewModel
                {
                    StudentReports = pagedResult.Success ? pagedResult.Data.Data : new List<StudentInformationReportModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    Category = (await categoriesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    StudentId = request.StudentId,
                    Gender = request.Gender,
                    CategoryId = request.CategoryId,
                    RTE = request.RTE
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StudentReport(StudentReportRequest request)
        {
            var model = new StudentInformationReportPageViewModel();
            try
            {
                model = await BuildStudentReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStudentReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentReportPageViewModel(request);
                return PartialView("_StudentReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentReportTablePartial", new StudentInformationReportPageViewModel());
            }
        }
        #endregion

        #region Class & Section Report 
        private async Task<StudentCountReportPageViewModel> BuildStudentClassSectionReportPageViewModel(StudentReportRequest request)
        {
            var model = new StudentCountReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETStudentCountReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature
                
                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new StudentCountReportPageViewModel
                {
                    StudentReports = pagedResult.Success ? pagedResult.Data.Data : new List<StudentCountReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> ClassSectionReport(StudentReportRequest request)
        {
            var model = new StudentCountReportPageViewModel();
            try
            {
                model = await BuildStudentClassSectionReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetClassSectionReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentClassSectionReportPageViewModel(request);
                return PartialView("_ClassSectionReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_ClassSectionReportTablePartial", new StudentCountReportPageViewModel());
            }
        }
        #endregion

        #region Guardian Report
        private async Task<GuardianReportResponsePageViewModel> BuildGuardianReportPageViewModel(StudentReportRequest request)
        {
            var model = new GuardianReportResponsePageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETStudentGuardianReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new GuardianReportResponsePageViewModel
                {
                    GuardianReport = pagedResult.Success ? pagedResult.Data.Data : new List<GuardianReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> GuardianReport(StudentReportRequest request)
        {
            var model = new GuardianReportResponsePageViewModel();
            try
            {
                model = await BuildGuardianReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetGuardianReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildGuardianReportPageViewModel(request);
                return PartialView("_GuardianReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_GuardianReportTablePartial", new GuardianReportResponsePageViewModel());
            }
        }
        #endregion

        #region Student Login Credential Report
        private async Task<LoginCredentialReportPageViewModel> BuildStudentLoginDetailReportPageViewModel(StudentReportRequest request)
        {
            var model = new LoginCredentialReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                request.UserType = "Student";
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETLoginCredentialReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new LoginCredentialReportPageViewModel
                {
                    LoginCredentialReport = pagedResult.Success ? pagedResult.Data.Data : new List<LoginCredentialReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> LoginDetailReport(StudentReportRequest request)
        {
            var model = new LoginCredentialReportPageViewModel();
            try
            {
                model = await BuildStudentLoginDetailReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStudentLoginDetailReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentLoginDetailReportPageViewModel(request);
                return PartialView("_StudentLoginDetailReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentLoginDetailReportTablePartial", new LoginCredentialReportPageViewModel());
            }
        }
        #endregion

        #region Parent Login Credential Report
        private async Task<LoginCredentialReportPageViewModel> BuildParentLoginDetailReportPageViewModel(StudentReportRequest request)
        {
            var model = new LoginCredentialReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                request.UserType = "Parent";
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETLoginCredentialReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new LoginCredentialReportPageViewModel
                {
                    LoginCredentialReport = pagedResult.Success ? pagedResult.Data.Data : new List<LoginCredentialReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> ParentLoginDetailReport(StudentReportRequest request)
        {
            var model = new LoginCredentialReportPageViewModel();
            try
            {
                model = await BuildParentLoginDetailReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetParentLoginDetailReportReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildParentLoginDetailReportPageViewModel(request);
                return PartialView("_ParentLoginDetailReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_ParentLoginDetailReportTablePartial", new LoginCredentialReportPageViewModel());
            }
        }
        #endregion

        #region Admission Report
        private async Task<AdmissionReportPageViewModel> BuildAdmissionReportPageViewModel(StudentReportRequest request)
        {
            var model = new AdmissionReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                request.UserType = "Parent";
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETAdmissionReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new AdmissionReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<AdmissionReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> AdmissionReport(StudentReportRequest request)
        {
            var model = new AdmissionReportPageViewModel();
            try
            {
                model = await BuildAdmissionReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetAdmissionReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildAdmissionReportPageViewModel(request);
                return PartialView("_AdmissionReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AdmissionReportTablePartial", new AdmissionReportPageViewModel());
            }
        }

        #endregion

        #region Student Profile
        private async Task<AdmissionReportPageViewModel> BuildStudentProfilePageViewModel(StudentReportRequest request)
        {
            var model = new AdmissionReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                request.UserType = "Parent";
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GETAdmissionReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new AdmissionReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<AdmissionReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StudentProfile(StudentReportRequest request)
        {
            var model = new AdmissionReportPageViewModel();
            try
            {
                model = await BuildStudentProfilePageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStudentProfilePartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentProfilePageViewModel(request);
                return PartialView("_StudentProfileTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentProfileTablePartial", new AdmissionReportPageViewModel());
            }
        }

        #endregion

        #region Student Gender Ratio Report
        private async Task<StudentGenderRatioReportPageViewModel> BuildStudentGenderRatioReportPageViewModel(StudentReportRequest request)
        {
            var model = new StudentGenderRatioReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetStudentGenderRatioReportReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new StudentGenderRatioReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<StudentGenderRatioReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> BoysGirlsRatio(StudentReportRequest request)
        {
            var model = new StudentGenderRatioReportPageViewModel();
            try
            {
                model = await BuildStudentGenderRatioReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetBoysGirlsRatioReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentGenderRatioReportPageViewModel(request);
                return PartialView("_StudentBoysGirlsRatioReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentBoysGirlsRatioReportTablePartial", new StudentGenderRatioReportPageViewModel());
            }
        }
        #endregion

        #region Class Subject Report

        private async Task<TimeTableClassSubjectReportPageViewModel> BuildClassSubjectReportPageViewModel(StudentReportRequest request)
        {
            var model = new TimeTableClassSubjectReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetClassSubjectReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new TimeTableClassSubjectReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<TimeTableClassSubjectReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> ClassSubjectReport(StudentReportRequest request)
        {
            var model = new TimeTableClassSubjectReportPageViewModel();
            try
            {
                model = await BuildClassSubjectReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetClassSubjectReportReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildClassSubjectReportPageViewModel(request);
                return PartialView("_ClassSubjectReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_ClassSubjectReportTablePartial", new TimeTableClassSubjectReportPageViewModel());
            }
        }

        #endregion

        #region Student Teacher Ratio Report

        private async Task<StudentTeacherRatioReportPageViewModel> BuildStudentTeacherRatioReportPageViewModel(StudentReportRequest request)
        {
            var model = new StudentTeacherRatioReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetStudentTeacherRatioReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature

                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask);

                var pagedResult = await reportTask;

                model = new StudentTeacherRatioReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<StudentTeacherRatioReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StudentTeacherRatio(StudentReportRequest request)
        {
            var model = new StudentTeacherRatioReportPageViewModel();
            try
            {
                model = await BuildStudentTeacherRatioReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStudentTeacherRatioReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentTeacherRatioReportPageViewModel(request);
                return PartialView("_StudentTeacherRatioReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentTeacherRatioReportTablePartial", new StudentTeacherRatioReportPageViewModel());
            }
        }

        #endregion

        #region Student Hostel Report
        private async Task<StudentHostelReportPageViewModel> BuildStudentHostelReportPageViewModel(StudentReportRequest request)
        {
            var model = new StudentHostelReportPageViewModel();
            try
            {
                var perms = await GetPermissions("/StudentInformationReport/Index");

                var companyId = request.CompanyId > 0 ? request.CompanyId : await GetCompanyId();
                var sessionId = request.SessionId > 0 ? request.SessionId : await GetSessionId();
                request.CompanyId = companyId;
                request.SessionId = sessionId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var reportTask = _client.GetStudentHostelReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classesTask = _classService.GetAllAsync(false, sessionId, companyId, staffId);          // ASSUMPTION: adjust to your actual signature
                var resHostel = _hostelClient.GetAllHostelsAsync(false, sessionId, companyId);
                await Task.WhenAll(reportTask, sessionTask, companiesTask, classesTask, resHostel);

                var pagedResult = await reportTask;

                model = new StudentHostelReportPageViewModel
                {
                    StudentLists = pagedResult.Success ? pagedResult.Data.Data : new List<StudentHostelReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    Classes = (await classesTask).Data ?? new(),
                    Hostels = (await resHostel).Data ?? new(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    HostelID=request.HostelID
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StudentHostelReport(StudentReportRequest request)
        {
            var model = new StudentHostelReportPageViewModel();
            try
            {
                model = await BuildStudentHostelReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // ✅ AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStudentHostelReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStudentHostelReportPageViewModel(request);
                return PartialView("_StudentHostelReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StudentHostelReportTablePartial", new StudentHostelReportPageViewModel());
            }
        }

        #endregion

        #region Staff Report
        private async Task<HRStaffReportPageViewModel> BuildStaffReportPageViewModel(StudentReportRequest request)
        {
            var model = new HRStaffReportPageViewModel();
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

                var reportTask = _client.GetStaffReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var roles = _roleClient.GetAllRolesAsync();         // ASSUMPTION: adjust to your actual signature
                var depart = _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                var desi = _hrClient.GetAllDesignationsAsync(companyId, sessionId);

                await Task.WhenAll(reportTask, sessionTask, companiesTask, roles, depart, desi);

                var pagedResult = await reportTask;
                var departResult = await depart;
                var desiResult = await desi;

                // FIX: Departments and Designations were being unwrapped with different
                // shapes (Data.Data vs Data) with no defensive check. Confirm both
                // GetAllDepartmentsAsync / GetAllDesignationsAsync actually return
                // different response wrappers on purpose — if not, make them consistent
                // on the service side instead of patching around it here.
                var departmentsList = departResult?.Data?.Data ?? new();
                var designationsList = desiResult?.Data ?? new();

                model = new HRStaffReportPageViewModel
                {
                    StaffList = pagedResult.Success ? pagedResult.Data.Data : new List<StaffReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Roles = (await roles).Data ?? new(),
                    Departments = departmentsList,
                    Designations = designationsList,
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    RoleID = request.RoleID,
                    DepartmentID = request.DepartmentID,
                    DesignationID = request.DesignationID,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StaffReport(StudentReportRequest request)
        {
            var model = new HRStaffReportPageViewModel();
            try
            {
                model = await BuildStaffReportPageViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStaffReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStaffReportPageViewModel(request);
                return PartialView("_StaffReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StaffReportTablePartial", new HRStaffReportPageViewModel());
            }
        }


        #endregion

        #region Stock Report
        private async Task<ItemStockReportPageViewModel> BuildStockReportViewModel(StudentReportRequest request)
        {
            var model = new ItemStockReportPageViewModel();
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

                var reportTask = _client.GetStockReportAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
               
                await Task.WhenAll(reportTask, sessionTask, companiesTask);

                var pagedResult = await reportTask;

                model = new ItemStockReportPageViewModel
                {
                    StockList = pagedResult.Success ? pagedResult.Data.Data : new List<ItemStockReportResponse>(),
                    Companies = (await companiesTask).Data ?? new(),                    
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,                    
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> StockReport(StudentReportRequest request)
        {
            var model = new ItemStockReportPageViewModel();
            try
            {
                model = await BuildStockReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetStockReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildStockReportViewModel(request);
                return PartialView("_StockReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_StockReportTablePartial", new ItemStockReportPageViewModel());
            }
        }


        #endregion

        #region Stock Report
        private async Task<AddItemReportPageViewModel> BuildAddItemReportViewModel(StudentReportRequest request)
        {
            var model = new AddItemReportPageViewModel();
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

                var reportTask = _client.GetAddItemReportAsync(request);
               
                await Task.WhenAll(reportTask);

                var pagedResult = await reportTask;

                model = new AddItemReportPageViewModel
                {
                    ItemList = pagedResult.Success ? pagedResult.Data.Data : new List<AddItemResponse>(),                    
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> AddItemReport(StudentReportRequest request)
        {
            var model = new AddItemReportPageViewModel();
            try
            {
                model = await BuildAddItemReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetAddItemReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildAddItemReportViewModel(request);
                return PartialView("_AddItemReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AddItemReportTablePartial", new AddItemReportPageViewModel());
            }
        }


        #endregion

        #region Stock Report
        private async Task<ItemIssueReportPageViewModel> BuildIssueItemReportViewModel(StudentReportRequest request)
        {
            var model = new ItemIssueReportPageViewModel();
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

                var reportTask = _client.GetIssueItemReportAsync(request);

                await Task.WhenAll(reportTask);

                var pagedResult = await reportTask;

                model = new ItemIssueReportPageViewModel
                {
                    ItemList = pagedResult.Success ? pagedResult.Data.Data : new List<ItemIssueResponse>(),
                    TotalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    PageNumber = pagedResult.Data?.PageNumber ?? request.PageNumber,
                    PageSize = pagedResult.Data?.PageSize ?? request.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = companyId,
                    SessionId = sessionId,
                    SearchType = request.SearchType,
                    DateFrom = request.DateFrom,
                    DateTo = request.DateTo
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<IActionResult> IssueItemReport(StudentReportRequest request)
        {
            var model = new ItemIssueReportPageViewModel();
            try
            {
                model = await BuildIssueItemReportViewModel(request);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetIssueItemReportPartial(StudentReportRequest request)
        {
            try
            {
                var model = await BuildIssueItemReportViewModel(request);
                return PartialView("_IssueItemReportTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_IssueItemReportTablePartial", new ItemIssueReportPageViewModel());
            }
        }


        #endregion
    }
}
