using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// Controller for managing student and staff certificates and ID cards.
    /// Handles listing, searching, adding, editing, deleting, toggling, and generating certificates and ID cards.
    /// Also provides API endpoints for related data such as classes, sections, students, staff, departments, and designations.
    /// Integrates with company, session, and permission services to ensure all operations are performed in the correct context and with proper authorization.
    /// </summary>
    public class CertificateController : BaseController
    {
        private readonly IStudentCertificateClientService _certificateClient;
        private readonly IStudentIDCardClientService _idCardClient;
        private readonly IStaffIDCardClientService _staffIdCardClient;
        private readonly IClassClientService _classClient;
        private readonly ISectionClientService _sectionClient;
        private readonly IStudentInformationClientService _studentInfoClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        public CertificateController(
            IStudentCertificateClientService certificateClient,
            IStudentIDCardClientService idCardClient,
            IStaffIDCardClientService staffIdCardClient,
            IClassClientService classClient,
            ISectionClientService sectionClient,
            IStudentInformationClientService studentInfoClient,
            IHumanResourceClientService hrClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            ISessionClientService sessionService,
            IConfiguration configuration,
            IPhotoUploadService photoService,

            PermissionHelper permHelper) : base(permHelper)
        {
            _certificateClient = certificateClient;
            _idCardClient = idCardClient;
            _staffIdCardClient = staffIdCardClient;
            _classClient = classClient;
            _sectionClient = sectionClient;
            _studentInfoClient = studentInfoClient;
            _hrClient = hrClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _sessionService = sessionService;
            _configuration = configuration;
            _photoService = photoService;
        }

        /// <summary>
        /// Retrieves the current user's ID from claims.
        /// Used for audit and context-sensitive operations.
        /// </summary>
        private int GetUserId() => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value, out var id) ? id : 0;

        /// <summary>
        /// Retrieves the current company ID for the logged-in user.
        /// If not cached, fetches from the company service.
        /// Ensures all certificate and ID card operations are performed in the correct company context.
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
        /// Retrieves the current session ID for the logged-in user.
        /// If not cached, fetches from the session service.
        /// Used to scope certificates and ID cards to the correct academic/financial session.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }

        /// <summary>
        /// Retrieves the staff ID for the currently logged-in user, if available.
        /// Used for filtering staff-specific data.
        /// </summary>
        private int? GetStaffIDForLogin()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }

        /// <summary>
        /// Displays the main student certificate listing page.
        /// Loads all certificates for the current company and session, and user permissions.
        /// </summary>
        public async Task<IActionResult> StudentCertificate()
        {
            try
            {
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Certificate/StudentCertificate"
               );
                var model = new StudentCertificatePageViewModel();
                var resp = await _certificateClient.GetAll(companyid, sessionId);
                if (resp.Success)
                {
                    model.Certificates = resp.Data;
                }
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }

        }

        /// <summary>
        /// Displays the certificate generation page for students.
        /// Loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> GenerateCertificate()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/HumanResource/Staffs"
           );

            return View(perms);
        }
        /// <summary>
        /// Displays the Add/Edit Student Certificate page.
        /// If an ID is provided, loads the certificate for editing; otherwise, prepares for a new entry.
        /// Loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> AddStudentCertificate(int? id)
        {
            var perms = await GetPermissions("/Certificate/StudentCertificate");

            var model = new StudentCertificatePageViewModel();

            if (id.HasValue && id.Value > 0)
            {
                var response = await _certificateClient.GetByID(id.Value);

                if (response.Success)
                {
                    model.EditStudentCertificate = response.Data;
                }
            }

            model.Permissions = perms;

            return View(model);
        }

        /// <summary>
        /// Displays the main student ID card listing page.
        /// Loads all student ID cards for the current company and session, and user permissions.
        /// </summary>
        public async Task<IActionResult> StudentIdCard()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Certificate/StudentIdCard"
           );
            var companyid = await GetCompanyId();
            var sessionId = await GetSessionId();
            var model = new StudentIDCardPageViewModel();
            var resp = await _idCardClient.GetAll(companyid, sessionId);
            if (resp.Success)
            {
                model.IDCards = resp.Data;
            }
            model.Permissions = perms;
            return View(model);
        }

        /// <summary>
        /// Displays the Add/Edit Student ID Card page.
        /// If an ID is provided, loads the ID card for editing; otherwise, prepares for a new entry.
        /// Loads user permissions for the page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> AddStudentIdCard(int? id)
        {
            var perms = await GetPermissions("/Certificate/StudentIdCard");

            var model = new StudentIDCardAddViewModel();

            model.Permissions = perms;

            if (id.HasValue && id.Value > 0)
            {
                var response = await _idCardClient.GetByID(id.Value);

                if (response.Success)
                {
                    model.EditStudentIDCard = response.Data;
                }
            }

            return View(model);
        }

        /// <summary>
        /// Displays the student ID card generation page.
        /// Loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> GenerateStudentIdCard()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Certificate/GenerateStudentIdCard"
           );
            return View(perms);
        }
        /// <summary>
        /// Displays the main staff ID card listing page.
        /// Loads all staff ID cards and user permissions.
        /// </summary>
        public async Task<IActionResult> StaffIdCard()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Certificate/StaffIdCard"
           );
            var model = new StaffIDCardPageViewModel();
            var resp = await _staffIdCardClient.GetAll();
            if (resp.Success)
            {
                model.IDCards = resp.Data;
            }
            model.Permissions = perms;
            return View(model);
        }
        /// <summary>
        /// Displays the Add/Edit Staff ID Card page.
        /// If an ID is provided, loads the ID card for editing; otherwise, prepares for a new entry.
        /// Loads user permissions for the page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> AddStaffIdCard(int? id)
        {
            var perms = await GetPermissions("/Certificate/StaffIdCard");

            var model = new StaffIDCardAddViewModel();
            model.Permissions = perms;

            if (id.HasValue && id.Value > 0)
            {
                var response = await _staffIdCardClient.GetByID(id.Value);

                if (response.Success)
                {
                    model.EditStaffIDCard = response.Data;
                }
            }

            return View(model);
        }

        /// <summary>
        /// Displays the staff ID card generation page.
        /// Loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> GenerateStaffIdCard()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Certificate/GenerateStaffIdCard"
           );
            return View(perms);
        }

        #region Certificate Module API Proxy Endpoints

        /// <summary>
        /// Gets all classes in the system.
        /// Used for populating dropdowns in certificate and ID card forms.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllClasses()
        {
            var res = await _classClient.GetAllAsync();
            return Json(res);
        }
        /// <summary>
        /// Gets all sections for a given class.
        /// Used for populating dropdowns in certificate and ID card forms.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSectionsByClass(int classId)
        {
            var res = await _sectionClient.GetByClassAsync(classId);
            return Json(res);
        }

        /// <summary>
        /// Gets a list of students filtered by class, section, and search term.
        /// Used for certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentList(int? classId = null, int? sectionId = null, string? searchTerm = null)
        {
            var companyId = await GetCompanyId();
            var sessionId = await GetSessionId();
            var res = await _studentInfoClient.GetStudentListAsync(companyId, sessionId, classId, sectionId, searchTerm);
            return Json(res);
        }
        /// <summary>
        /// Gets a student by their unique ID.
        /// Used for certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentByID(int id)
        {
            int companyId = await GetCompanyId();
            int sessionId = await GetSessionId();
            var res = await _studentInfoClient.GetStudentByIDAsync(id, companyId, sessionId);
            return Json(res);
        }

        /// <summary>
        /// Gets all departments for the current company and session.
        /// Used for staff certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllDepartments()
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var res = await _hrClient.GetAllDepartmentsAsync(companyId, sessionId);
                return Json(res);
            }
            catch (Exception ex)
            {
                throw;
            }

        }
        /// <summary>
        /// Gets all designations for the current company and session.
        /// Used for staff certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllDesignations()
        {
            try
            {
                int companyId = await GetCompanyId();
                int sessionId = await GetSessionId();
                var res = await _hrClient.GetAllDesignationsAsync(companyId, sessionId);
                return Json(res);
            }
            catch (Exception ex)
            {
                throw;
            }

        }
        /// <summary>
        /// Gets all staff for the current company and session, filtered by the logged-in staff if available.
        /// Used for staff certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStaff()
        {
            var sessionId = await GetSessionId();
            var companyId = await GetCompanyId();
            var staffId = GetStaffIDForLogin();
            var res = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
            return Json(res);
        }
        /// <summary>
        /// Gets a staff member by their unique ID.
        /// Used for staff certificate and ID card assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStaffByID(int id)
        {
            var res = await _hrClient.GetStaffByIDAsync(id);
            return Json(res);
        }

        /// <summary>
        /// Gets all student ID cards for the current company and session.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStudentIDCards()
        {
            try
            {
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _idCardClient.GetAll(companyid, sessionId);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// Gets a student ID card by its unique ID.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentIDCardByID(int id)
        {
            var res = await _idCardClient.GetByID(id);
            return Json(res);
        }



        /// <summary>
        /// Creates or updates a student ID card.
        /// Checks permissions for add/edit and ensures company/session context.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        //[HttpPost]
        //public async Task<IActionResult> UpsertStudentIDCard([FromForm] StudentIDCardUpsertRequest request)
        //{
        //    try
        //    {
        //        bool isCreate = request.IDCardID <= 0;

        //        if (isCreate && !(await _menuPerm.Has("/Certificate/StudentIdCard", "Add")).Data)
        //        {
        //            return Json(new { success = false, message = "You do not have permission to add student ID cards." });
        //        }

        //        if (!isCreate && !(await _menuPerm.Has("/Certificate/StudentIdCard", "Edit")).Data)
        //        {
        //            return Json(new { success = false, message = "You do not have permission to edit student ID cards." });
        //        }
        //        if (request.CompanyID == 0 || request.CompanyID == null)
        //        {
        //            request.CompanyID = await GetCompanyId();
        //        }
        //        if (request.SessionID == 0 || request.SessionID == null)
        //        {
        //            request.SessionID = await GetSessionId();
        //        }

        //        var response = await _idCardClient.Upsert(request);

        //        return Json(new { success = response.Success, message = response.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = ex.Message });
        //    }
        //}
        [HttpPost]
        public async Task<IActionResult> UpsertStudentIDCard([FromForm] StudentIDCardUpsertRequest request)
        {
            try
            {
                bool isCreate = request.IDCardID <= 0;

                if (isCreate && !(await _menuPerm.Has("/Certificate/StudentIdCard", "Add")).Data)
                {
                    return Json(new { success = false, message = "You do not have permission to add student ID cards." });
                }

                if (!isCreate && !(await _menuPerm.Has("/Certificate/StudentIdCard", "Edit")).Data)
                {
                    return Json(new { success = false, message = "You do not have permission to edit student ID cards." });
                }

                if (request.CompanyID == 0)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0)
                {
                    request.SessionID = await GetSessionId();
                }

                // Read the uploaded files into the byte[] properties
                async Task Fill(IFormFile? f, Action<byte[], string, string> set)
                {
                    if (f == null || f.Length == 0) return;
                    using var ms = new MemoryStream();
                    await f.CopyToAsync(ms);
                    set(ms.ToArray(), f.ContentType, f.FileName);
                }

                await Fill(request.BackgroundImageFile, (b, t, n) =>
                {
                    request.BackgroundImage = b;
                    request.BackgroundImageType = t;
                    request.BackgroundImageName = n;
                });
                await Fill(request.LogoImageFile, (b, t, n) =>
                {
                    request.LogoImage = b;
                    request.LogoImageType = t;
                    request.LogoImageName = n;
                });
                await Fill(request.SignatureImageFile, (b, t, n) =>
                {
                    request.SignatureImage = b;
                    request.SignatureImageType = t;
                    request.SignatureImageName = n;
                });

                var response = await _idCardClient.Upsert(request);

                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes one or more student ID cards by their IDs.
        /// Checks delete permission before proceeding.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStudentIDCard([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has("/Certificate/StudentIdCard", "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete student ID cards." });

            var res = await _idCardClient.Delete(id);
            return Json(res);
        }

        /// <summary>
        /// Toggles the active/inactive status of a student ID card.
        /// Accepts a status update request and calls the client service to update the status.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStudentIDCardStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _idCardClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Gets all staff ID cards.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStaffIDCards()
        {
            var res = await _staffIdCardClient.GetAll();
            return Json(res);
        }
        /// <summary>
        /// Gets a staff ID card by its unique ID.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStaffIDCardByID(int id)
        {
            var res = await _staffIdCardClient.GetByID(id);
            return Json(res);
        }


        /// <summary>
        /// Creates or updates a staff ID card.
        /// Checks permissions for add/edit and calls the client service to save.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertStaffIDCard([FromBody] StaffIDCardUpsertRequest request)
        {
            try
            {
                bool isCreate = request.IDCardID <= 0;

                if (isCreate && !(await _menuPerm.Has("/Certificate/StaffIdCard", "Add")).Data)
                {
                    return Json(new { success = false, message = "You do not have permission to add staff ID cards." });
                }

                if (!isCreate && !(await _menuPerm.Has("/Certificate/StaffIdCard", "Edit")).Data)
                {
                    return Json(new { success = false, message = "You do not have permission to edit staff ID cards." });
                }

                var response = await _staffIdCardClient.Upsert(request);

                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes one or more staff ID cards by their IDs.
        /// Checks delete permission before proceeding.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStaffIDCard([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has("/Certificate/StaffIdCard", "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete staff ID cards." });

            var res = await _staffIdCardClient.Delete(id);
            return Json(res);
        }

        /// <summary>
        /// Toggles the active/inactive status of a staff ID card.
        /// Accepts a status update request and calls the client service to update the status.
        /// Returns a JSON result indicating success or failure.
        /// </summary>

        [HttpPost]
        public async Task<IActionResult> ToggleStaffIDCardStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _staffIdCardClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Gets all student certificates for the current company and session.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllStudentCertificates()
        {
            try
            {
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _certificateClient.GetAll(companyid, sessionId);
                return Json(res);
            }
            catch (Exception ex)
            {
                throw;
            }

        }
        /// <summary>
        /// Gets a student certificate by its unique ID.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudentCertificateByID(int id)
        {
            var res = await _certificateClient.GetByID(id);
            return Json(res);
        }
        /// <summary>
        /// Creates or updates a student certificate.
        /// Checks permissions for add/edit and ensures company/session context.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertStudentCertificate([FromForm] StudentCertificateUpsertRequest request, IFormFile? backgroundImageFile)
        {
            try
            {
                // The browser posts the image as a multipart file (backgroundImageFile); the API expects it as bytes.
                if (backgroundImageFile != null && backgroundImageFile.Length > 0)
                {
                    using var ms = new MemoryStream();
                    await backgroundImageFile.CopyToAsync(ms);
                    request.BackgroundImage = ms.ToArray();
                    request.BackgroundImageType = backgroundImageFile.ContentType;
                    request.BackgroundImageName = backgroundImageFile.FileName;
                }

                var isCreate = request.CertificateID <= 0;
                if (isCreate && !(await _menuPerm.Has("/Certificate/StudentCertificate", "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add student certificates." });
                if (!isCreate && !(await _menuPerm.Has("/Certificate/StudentCertificate", "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit student certificates." });

                if (request.CompanyId == 0 || request.CompanyId == null)
                    request.CompanyId = await GetCompanyId();
                if (request.SessionId == 0 || request.SessionId == null)
                    request.SessionId = await GetSessionId();

                var res = await _certificateClient.Upsert(request);
                return Json(res);
            }
            catch (Exception ex)
            {
                // consider logging + returning a JSON error instead of rethrowing,
                // so the client always gets a JSON response it can parse
                throw;
            }
        }
        /// <summary>
        /// Deletes one or more student certificates by their IDs.
        /// Checks delete permission before proceeding.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteStudentCertificate([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has("/Certificate/StudentCertificate", "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete student certificates." });

            var res = await _certificateClient.Delete(id);
            return Json(res);
        }

        /// <summary>
        /// Toggles the active/inactive status of a student certificate.
        /// Accepts a status update request and calls the client service to update the status.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStudentCertificateStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _certificateClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// Generates a student certificate for a specific student and certificate template.
        /// Calls the certificate client service to generate the certificate and returns the result as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GenerateStudentCertificate(int studentId, int certificateId)
        {
            var res = await _certificateClient.Generate(studentId, certificateId);
            return Json(res);
        }

        #endregion
    }
}
