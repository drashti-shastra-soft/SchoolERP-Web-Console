using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SchoolERPWebClient.Helpers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// Controller for managing all system settings, including company, roles, users, email/SMS configs, payment methods, languages, fields, and more.
    /// Provides endpoints for both page rendering and AJAX data operations, ensuring all actions are permission-checked and context-aware.
    /// </summary>
    public class SettingsController : BaseController
    {
        private readonly ISettingsClientService _settingsClient;
        private readonly IRoleClientService _roleClient;
        private readonly IUserClientService _userClient;
        private readonly IEmailConfigClientService _emailClient;
        private readonly ISmsConfigClientService _smsClient;
        private readonly IPaymentMethodClientService _paymentClient;
        private readonly ICompanyClientService _companyClient;
        private readonly ISessionClientService _sessionClient;
        private readonly ICurrencyClientService _currencyClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IPostalCodeClienService _postalCodeService;
        private readonly ICityClientService _cityService;
        private readonly IStateClientService _stateService;
        private readonly ICountryClientService _countryService;
        private readonly IPhotoUploadService _photoService;
        private const string SettingsMenuPath = "/Settings";

        public SettingsController(
            ISettingsClientService settingsClient, 
            IRoleClientService roleClient, 
            IUserClientService userClient,
            IEmailConfigClientService emailClient,
            ISmsConfigClientService smsClient,
            IPaymentMethodClientService paymentClient,
            ICompanyClientService companyClient,
            ISessionClientService sessionClient,
            ICurrencyClientService currencyClient,
            IUserMenuPermissionClientService menuPerm,
             IPostalCodeClienService postalCodeService,
            ICityClientService cityClientService,
            IStateClientService stateClientService,
            ICountryClientService countryClientService,
            PermissionHelper permHelper, IPhotoUploadService photoService) : base(permHelper)
        {
            _settingsClient = settingsClient;
            _roleClient = roleClient;
            _userClient = userClient;
            _emailClient = emailClient;
            _smsClient = smsClient;
            _paymentClient = paymentClient;
            _companyClient = companyClient;
            _sessionClient = sessionClient;
            _currencyClient = currencyClient;
            _postalCodeService = postalCodeService;
            _cityService = cityClientService;
            _stateService = stateClientService;
            _countryService = countryClientService;
            _menuPerm = menuPerm;
            _photoService = photoService;
        }

        /// <summary>
        /// Shows the general settings page for the school's main information.
        /// </summary>
        public IActionResult CompanyMaster()
        {
            ViewData["Title"] = "Company Master";
            return View();
        }

        /// <summary>
        /// Retrieves the current company ID for the logged-in user, fetching from the service if not cached.
        /// Ensures all settings operations are performed in the correct company context.
        /// </summary>
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyClient.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        /// <summary>
        /// Retrieves the current session ID for the logged-in user, fetching from the service if not cached.
        /// Used to scope settings and data to the correct academic/financial session.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionClient.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        /// <summary>
        /// Shows the page for managing user roles and their permissions.
        /// Loads all roles and displays them for editing or assignment.
        /// </summary>
        public async Task<IActionResult> Roles()
        {
            ViewData["Title"] = "Roles & Permission";
            
            // Invoke the backend Role Service to fetch all available roles
            var rolesResponse = await _roleClient.GetAllRolesAsync();
            
            // Map the service response to the ViewModel, providing an empty list fallback if the database call fails
            var model = new RolesPageViewModel
            {
                Roles = rolesResponse.Success
                    ? rolesResponse.Data.Select(r => new RoleViewModel
                    {
                        RoleID = r.RoleID,
                        RoleName = r.RoleName,
                        Description = r.RoleDesc ?? "",
                        IsActive = r.IsActive
                    }).ToList()
                    : new List<RoleViewModel>()
            };
            return View(model);
        }

        /// <summary>
        /// Gets the list of allowed actions (permissions) for a specific role.
        /// Returns as JSON for use in permission management UIs.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPermissions(int roleId)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "View")).Data)
                return Json(new { success = false, message = "You do not have permission to view role permissions.", permissions = (object?)null });

            var response = await _roleClient.GetPermissionsAsync(roleId);
            return Json(new { success = response.Success, permissions = response.Data, message = response.Message });
        }

        /// <summary>
        /// Saves a new user role or updates an existing one.
        /// Checks permissions for add/edit and transforms the request for the service layer.
        /// Returns a JSON result indicating success or failure.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveRole([FromBody] RoleUpsertRequest request)
        {
            var isCreate = request.RoleID <= 0;
            if (isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add roles." });
            if (!isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit roles." });

            // Transform the simplified incoming request into the strict Upsert pipeline request
            var serviceRequest = new MstRoleUpsertRequest
            {
                RoleID = request.RoleID,
                RoleName = request.RoleName,
                RoleDesc = request.Description,
                IsActive = true // Force active status on new creates from Settings Module wrapper
            };

            var response = await _roleClient.SaveRoleAsync(serviceRequest);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Saves the chosen list of allowed actions for a specific role.
        /// Checks edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveRolePermissions([FromBody] MstRolePermissionSaveRequest request)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to update role permissions." });

            var response = await _roleClient.SavePermissionsAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Shows the page for setting up academic sessions (school years).
        /// </summary>
        public IActionResult Sessions()
        {
            ViewData["Title"] = "Sessions Setting";
            return View();
        }

        /// <summary>
        /// Shows the page for managing the different types of money (currencies) used in the system.
        /// </summary>
        public IActionResult Currencies()
        {
            ViewData["Title"] = "Currencies";
            return View();
        }

        /// <summary>
        /// Shows the page for configuring the email server for sending notifications.
        /// Loads current email settings and permissions.
        /// </summary>
        public async Task<IActionResult> EmailSettings()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Settings"
           );
            ViewData["Title"] = "Email Settings";
            var companyId = await GetCompanyId();
            var response = await _emailClient.GetEmailConfigAsync(companyId);
            //var model = (response.Success && response.Data != null) ? response.Data : new MstEmailConfigViewModel();
            var model = new EmailConfigPageViewModel
            {
                mstEmail = (response.Success && response.Data != null) ? response.Data : new MstEmailConfigViewModel()
            };
            model.Permissions = perms;
            return View(model);
        }

        /// <summary>
        /// Saves the email server settings provided by the user.
        /// Checks edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveEmailSettings([FromBody] MstEmailConfigUpsertRequest request)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change email settings." });
            request.CompanyId = await GetCompanyId();
            var response = await _emailClient.UpsertEmailConfigAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Shows the page for configuring the SMS gateway for sending text messages.
        /// Loads current SMS settings and permissions.
        /// </summary>
        public async Task<IActionResult> SmsSettings()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Settings"
           );
            var companyId = await GetCompanyId();
            ViewData["Title"] = "SMS Settings";
            var response = await _smsClient.GetSmsConfigAsync(companyId);
            //var model = (response.Success && response.Data != null) ? response.Data : new MstSmsConfigViewModel();
            var model = new MstSmsConfigPageViewModel
            {
                mstSms= (response.Success && response.Data != null) ? response.Data : new MstSmsConfigViewModel()
            };
            model.Permissions = perms;
            return View(model);
        }

        /// <summary>
        /// Saves the SMS gateway settings provided by the user.
        /// Checks edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveSmsSettings([FromBody] MstSmsConfigUpsertRequest request)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change SMS settings." });
            request.CompanyId = await GetCompanyId();
            var response = await _smsClient.UpsertSmsConfigAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Shows the page for managing the different languages the system supports.
        /// </summary>
        public IActionResult Languages()
        {
            ViewData["Title"] = "Languages";
            return View();
        }

        /// <summary>
        /// Shows the page for editing translations for a specific language.
        /// Loads all translation strings for the selected language.
        /// </summary>
        public async Task<IActionResult> Translations(string id)
        {
            // Fail safe routing to root Languages board
            if (string.IsNullOrEmpty(id)) return RedirectToAction("Languages");
            
            ViewData["Title"] = "Translate " + System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(id.Replace("_", " "));
            ViewData["SelectedLanguage"] = id;
            
            // Extracts all JSON localized string translations from db/file cache
            var response = await _settingsClient.GetTranslationsAsync(id);
            return View(response.Success ? response.Data : new Dictionary<string, string>());
        }

        /// <summary>
        /// Saves the updated translation for a specific word or phrase.
        /// Checks edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpdateTranslation([FromBody] TranslationUpdateModel model)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to update translations." });

            var response = await _settingsClient.UpdateTranslationAsync(model);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Redirects to the main menu setup page.
        /// </summary>
        public IActionResult SidebarMenu()
        {
            return RedirectToAction("Index", "MasterMenu");
        }

        /// <summary>
        /// Shows the notification settings page.
        /// </summary>
        public IActionResult Notifications() => View();

        /// <summary>
        /// Shows the page for managing different payment methods (e.g., Razorpay).
        /// Loads current payment methods and permissions.
        /// </summary>
        public async Task<IActionResult> PaymentMethods()
        {
            // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
            var perms = await GetPermissions(
               "/Settings"
           );
            ViewData["Title"] = "Payment Methods";
            var companyResponse = await _companyClient.GetUserCurrentCompanyAsync();
            int companyId =await GetCompanyId();// companyResponse.Success ? (companyResponse.Data ?? 0) : 0;
            
            var response = await _paymentClient.GetPaymentMethodByCompanyAsync(companyId);
            var model = new PaymentMethodsPageViewModel
            {
                PaymentMethod = response.Success ? response.Data : null
            };
            model.Permissions = perms;
            return View(model);
        }

        /// <summary>
        /// Saves or updates a payment method's details.
        /// Checks add/edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SavePaymentMethod([FromBody] MstPaymentMethodUpsertRequest request)
        {
            var isCreate = request.PaymentId <= 0;
            if (isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add payment methods." });
            if (!isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit payment methods." });

            var companyResponse = await _companyClient.GetUserCurrentCompanyAsync();
            request.CompanyId = companyResponse.Success ? (companyResponse.Data ?? 0) : 0;

            if (request.CompanyId <= 0)
                return Json(new { success = false, message = "Unable to determine current company." });

            var response = await _paymentClient.UpsertPaymentMethodAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Permanently removes a payment method from the system.
        /// Checks delete permission before deleting.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeletePaymentMethod(int id)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete payment methods." });

            var response = await _paymentClient.DeletePaymentMethodAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Turns a payment method on or off.
        /// Checks edit permission before toggling.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> TogglePaymentStatus(int id, bool isActive)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change payment method status." });

            var response = await _paymentClient.ToggleStatusAsync(id, isActive);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Shows the history of system backups.
        /// </summary>
        public IActionResult BackupHistory() => View();

        /// <summary>
        /// Shows the page for setting up what appears at the top and bottom of printed documents.
        /// </summary>
        public IActionResult PrintHeaderFooter() => View();

        /// <summary>
        /// Shows the 'System Fields' page for managing built-in fields.
        /// Loads all system fields, companies, sessions, and permissions.
        /// </summary>
        public async Task<FieldPageViewModel> BuildSystemFieldsPageViewModel(int? pageIndex,
       int? pageSize,
       string? search,
       int? companyId,
       int? sessionID,
       string? belogto)
        {
            var model = new FieldPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Settings/SystemFields"
               );
                ViewData["Title"] = "Custom Fields";
                var request = new FieldSearchRequestModel
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyId = companyId ?? await GetCompanyId(),
                    SessionId = sessionID ?? await GetSessionId(),
                    IsSystemField = true,
                    BelongsTo= belogto ?? "students",
                };


                var sessionId = await GetSessionId();
                var classesResponse = _settingsClient.GetAllFieldWithPageAsync(request);

                var sessionTask = _sessionClient.GetAllAsync();
                var companiesTask = _companyClient.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new FieldPageViewModel
                {
                    fieldModels = pagedResult.Success ? pagedResult.Data.Data : new List<FieldModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyId,
                    SessionId = request.SessionId,
                    BelongsTo=request.BelongsTo
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
        /// Shows the 'System Fields' management page.
        /// Loads all system fields and related data for display.
        /// </summary>
        public async Task<IActionResult> SystemFields(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, string? belogto)
        {
            var model = new FieldPageViewModel();
            try
            {
                model = await BuildSystemFieldsPageViewModel(pageIndex, pageSize, search, companyId, sessionID, belogto);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// AJAX endpoint that returns only the system fields table and pagination partial view.
        /// Used for dynamic updates of the fields list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSystemFieldsPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID, string? belogto)
        {
            try
            {
                var model = await BuildSystemFieldsPageViewModel(pageIndex, pageSize, search, companyId, sessionID, belogto);

                return PartialView("_SystemFieldsTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SystemFieldsTablePartial", new FieldPageViewModel());
            }
        }

        /// <summary>
        /// Shows the settings for student profile information.
        /// </summary>
        public IActionResult StudentProfile() => View();

        /// <summary>
        /// Shows the page for managing different parts (modules) of the application.
        /// </summary>
        public IActionResult Modules() => View();

        /// <summary>
        /// Shows the settings for allowed file types.
        /// </summary>
        public IActionResult FileType() => View();

        /// <summary>
        /// Shows the 'Custom Fields' page where you can add your own data fields to forms like Student Admission.
        /// </summary>        
        public async Task<FieldPageViewModel> BuildCustomFieldsPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new FieldPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Settings/CustomFields"
               );
                ViewData["Title"] = "Custom Fields";
                var request = new FieldSearchRequestModel
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyId = companyId ?? await GetCompanyId(),
                    SessionId = sessionID ?? await GetSessionId(),
                    IsSystemField= false,
                };


                var sessionId = await GetSessionId();
                var classesResponse = _settingsClient.GetAllFieldWithPageAsync(request);
               
                var sessionTask = _sessionClient.GetAllAsync(false,request.CompanyId);
                var companiesTask = _companyClient.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new FieldPageViewModel
                {
                    fieldModels = pagedResult.Success ? pagedResult.Data.Data : new List<FieldModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyId,
                    SessionId = request.SessionId
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
        /// Shows the 'Custom Fields' management page.
        /// Loads all custom fields and related data for display.
        /// </summary>
        public async Task<IActionResult> CustomFields(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new FieldPageViewModel();
            try
            {
                model = await BuildCustomFieldsPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// AJAX endpoint that returns only the custom fields table and pagination partial view.
        /// Used for dynamic updates of the fields list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCustomFieldsPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildCustomFieldsPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_CustomFieldsTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_CustomFieldsTablePartial", new FieldPageViewModel());
            }
        }

        /// <summary>
        /// Shows the Add/Edit Custom Field page.
        /// Loads the field for editing if an ID is provided, otherwise prepares for a new entry.
        /// Loads user permissions for the page.
        /// </summary>
        public async Task<IActionResult> AddCustomFields(int? id)
        {
            var model = new FieldAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _settingsClient.GetFieldByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Field = response.Data;
                        model.EditField = response.Data;
                    }
                }
                else
                {
                    model.EditField = null;
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
        /// Shows the settings for security captcha tests.
        /// </summary>
        public IActionResult Captcha() => View();

        /// <summary>
        /// Shows the page for uploading the school's logo.
        /// </summary>
        public IActionResult Logo() => View();

        /// <summary>
        /// Shows the page for changing the login screen background.
        /// </summary>
        public IActionResult LoginPageBG() => View();

        /// <summary>
        /// Shows the settings for student and guardian information.
        /// </summary>
        public IActionResult StudentGuardian() => View();

        /// <summary>
        /// Shows the page for configuring how IDs (like Admission Numbers) are automatically generated.
        /// </summary>
        public IActionResult IDAutoGen() => View();

        /// <summary>
        /// Shows the settings for different types of attendance.
        /// </summary>
        public IActionResult AttendanceType() => View();

        /// <summary>
        /// Shows the system maintenance page.
        /// </summary>
        public IActionResult Maintenance() => View();

        /// <summary>
        /// Shows various other small settings.
        /// </summary>
        public IActionResult Miscellaneous() => View();
        /// <summary>
        /// Shows the main page for managing all registered companies and branches.
        /// </summary>
        
        public async Task<MstCompanyPageViewModel> BuildCompaniesPageViewModel(int? pageIndex,
        int? pageSize,
        string? search)
        {
            var model = new MstCompanyPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Settings"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };


                var companiesResponse = await _companyClient.GetAllCompanyWithPageAsync(request);


                
                ViewData["Title"] = "Company Master";                
                var sessionsResponse = await _sessionClient.GetAllAsync();
                var currenciesResponse = await _currencyClient.GetAllAsync();

                var pagedResult = companiesResponse.Success ? companiesResponse.Data : null;
                var rawCompanies = pagedResult?.Data ?? new List<MstCompanyViewModel>();

                var hierarchicalCompanies = new List<MstCompanyViewModel>();
                BuildCompanyHierarchy(rawCompanies, hierarchicalCompanies, null, 0);

                model = new MstCompanyPageViewModel
                {
                    Companies = hierarchicalCompanies,
                    ParentCompanies = rawCompanies,
                    Sessions = sessionsResponse.Success ? sessionsResponse.Data : new List<MstSessionViewModel>(),
                    Currencies = currenciesResponse.Success ? currenciesResponse.Data : new List<MstCurrencyViewModel>(),
                    
                    TotalRecords = pagedResult?.TotalRecords ?? 0,
                    PageNumber = pagedResult.PageNumber,
                    PageSize = pagedResult?.PageSize ?? request.PageSize,
                    SearchTerm = search
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
        /// Shows the companies management page.
        /// Loads all companies and related data for display.
        /// </summary>
        public async Task<IActionResult> Companies(int? pageIndex,
        int? pageSize,
        string? search)
        {
            var model = new MstCompanyPageViewModel();
            try
            {
                model = await BuildCompaniesPageViewModel(pageIndex, pageSize, search);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// AJAX endpoint that returns only the companies table and pagination partial view.
        /// Used for dynamic updates of the companies list without reloading the entire page.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCompaniesPartial(int? pageIndex,
        int? pageSize,
        string? search)
        {
            try
            {
                var model = await BuildCompaniesPageViewModel(pageIndex, pageSize, search);

                return PartialView("_CompaniesTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_CompaniesTablePartial", new MstCompanyPageViewModel());
            }
        }
        /// <summary>
        /// Shows the Add/Edit Company page.
        /// Loads the company for editing if an ID is provided, otherwise prepares for a new entry.
        /// Loads user permissions and related data for the page.
        /// </summary>
        public async Task<IActionResult> AddCompanies(int? id)
        {
            var model = new CompaniesAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Language/Add"
               );
                var sessionId =await GetSessionId();
                var companiesResponse = await _companyClient.GetAllAsync();
                var country = await _countryService.GetAllAsync(await GetCompanyId(), sessionId);
                var state = await _stateService.GetAllAsync(await GetCompanyId(), sessionId);
                var city = await _cityService.GetAllAsync(await GetCompanyId(), sessionId);


                ViewData["Title"] = "Company Master";
                var sessionsResponse = await _sessionClient.GetAllAsync();
                var currenciesResponse = await _currencyClient.GetAllAsync();

                var rawCompanies = companiesResponse.Success ? companiesResponse.Data : new List<MstCompanyViewModel>();
                var hierarchicalCompanies = new List<MstCompanyViewModel>();
                BuildCompanyHierarchy(rawCompanies, hierarchicalCompanies, null, 0);

                model = new CompaniesAddPageViewModel
                {
                    Companies = hierarchicalCompanies,
                    ParentCompanies = rawCompanies,
                    Sessions = sessionsResponse.Success ? sessionsResponse.Data : new List<MstSessionViewModel>(),
                    Currencies = currenciesResponse.Success ? currenciesResponse.Data : new List<MstCurrencyViewModel>()
                };
                model.Permissions = perms;

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _companyClient.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditCompanies = response.Data;
                    }
                }
                else
                {
                    model.EditCompanies = null;
                }
                model.Country = country.Data;
                model.State = state.Data;
                //model.City = city.Data.Data;
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
        /// Builds a hierarchical structure of companies for display in tree views or dropdowns.
        /// Recursively adds child companies to the target list.
        /// </summary>
        private void BuildCompanyHierarchy(List<MstCompanyViewModel> source, List<MstCompanyViewModel> target, int? parentId, int level)
        {
            var children = source.Where(c => c.ParentCompanyId == parentId).OrderBy(c => c.SchoolName).ToList();
            foreach (var child in children)
            {
                child.Level = level;
                child.HasChildren = source.Any(c => c.ParentCompanyId == child.CompanyId);
                target.Add(child);
                BuildCompanyHierarchy(source, target, child.CompanyId, level + 1);
            }

            // Also add any orphaned nodes (where parent is not in source) at level 0 if this is the top-level call
            if (parentId == null)
            {
                var orphans = source.Where(c => c.ParentCompanyId != null && !source.Any(p => p.CompanyId == c.ParentCompanyId) && !target.Any(t => t.CompanyId == c.CompanyId)).OrderBy(c => c.SchoolName).ToList();
                foreach (var orphan in orphans)
                {
                    orphan.Level = 0;
                    orphan.HasChildren = source.Any(c => c.ParentCompanyId == orphan.CompanyId);
                    target.Add(orphan);
                    BuildCompanyHierarchy(source, target, orphan.CompanyId, 1);
                }
            }
        }


        /// <summary>
        /// Save call for Upload logo & login Background Image
        /// </summary>
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        // Maps the imageType key sent from JS to the folder/column your service updates
        private static readonly Dictionary<string, string> ImageTypeFolders = new()
        {
            ["PrintLogo"] = "PrintLogo",
            ["AdminLogo"] = "AdminLogo",
            ["AdminSmallLogo"] = "AdminSmallLogo",
            ["WaterMark"] = "WaterMark",
            ["LoginBackground"] = "LoginBackground"
        };

        [HttpPost]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
        public async Task<IActionResult> UploadCompanyImage(int companyId, string imageType, IFormFile file)
        {
            if (companyId <= 0)
                return Json(new { success = false, message = "Please save the company before uploading images." });

            if (file == null || file.Length == 0)
                return Json(new { success = false, message = "No file received." });

            if (!ImageTypeFolders.ContainsKey(imageType))
                return Json(new { success = false, message = "Unknown image type." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return Json(new { success = false, message = "Only JPG, PNG, or WEBP files are allowed." });

            var response = await _companyClient.UpdateCompanyImageAsync(companyId, imageType, file);

            if (!response.Success)
                return Json(new { success = false, message = response.Message ?? "Could not update company record." });

            // response.Data is expected to carry back whatever the API returns (e.g. a file URL or base64)
            return Json(new { success = true, imageUrl = response.Data });
        }



        /// <summary>
        /// Saves a new company or updates an existing one.
        /// Checks add/edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveCompany([FromBody] MstCompanyUpsertRequest request)
        {
            var isCreate = request.CompanyId <= 0;
            if (isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add companies." });
            if (!isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit companies." });

            var response = await _companyClient.UpsertAsync(request);
            if (!response.Success)
                return Json(new { success = false, message = response.Message });

            // New company -> id returned by the save. Edit -> id from the page.
            int companyId = isCreate ? response.Data : request.CompanyId;

            var warnings = new List<string>();

            if (companyId <= 0)
            {
                // company is saved, but we cannot attach files without its id
                bool hadLogos = !string.IsNullOrWhiteSpace(request.PrintLogoBase64)
                             || !string.IsNullOrWhiteSpace(request.AdminLogoBase64)
                             || !string.IsNullOrWhiteSpace(request.AdminSmallLogoBase64)
                             || !string.IsNullOrWhiteSpace(request.WaterMarkBase64)
                             || !string.IsNullOrWhiteSpace(request.LoginBackgroundBase64);
                if (hadLogos)
                    warnings.Add("The new company id was not returned, so the logos were not uploaded.");
            }
            else
            {
                try
                {
                    var logo = new CompanyLogoRequest
                    {
                        CompanyID = companyId,
                        UserID = GetStaffID() ?? 0,
                        PrintLogo=request.PrintLogoBase64,
                        PrintLogoName=request.PrintLogoName,

                        AdminLogo = request.AdminLogoBase64,
                        AdminLogoName = request.AdminLogoName,

                        AdminSmallLogo = request.AdminSmallLogoBase64,
                        AdminSmallLogoName = request.AdminSmallLogoName,

                        WaterMarkLogo = request.WaterMarkBase64,
                        WaterMarkLogoName = request.WaterMarkName,

                        BackgroundLogo = request.LoginBackgroundBase64,
                        BackgroundLogoName = request.LoginBackgroundName,
                    };

                    // each image is independent: one failing does not block the others
                    (logo.PrintLogo, logo.PrintLogoType, logo.PrintLogoName) =
                        await UploadLogoAsync(request.PrintLogoBase64, request.PrintLogoName, "PrintLogo", companyId, warnings);

                    (logo.AdminLogo, logo.AdminLogoType, logo.AdminLogoName) =
                        await UploadLogoAsync(request.AdminLogoBase64, request.AdminLogoName, "AdminLogo", companyId, warnings);

                    (logo.AdminSmallLogo, logo.AdminSmallLogoType, logo.AdminSmallLogoName) =
                        await UploadLogoAsync(request.AdminSmallLogoBase64, request.AdminSmallLogoName, "AdminSmallLogo", companyId, warnings);

                    (logo.WaterMarkLogo, logo.WaterMarkLogoType, logo.WaterMarkLogoName) =
                        await UploadLogoAsync(request.WaterMarkBase64, request.WaterMarkName, "WaterMark", companyId, warnings);

                    (logo.BackgroundLogo, logo.BackgroundLogoType, logo.BackgroundLogoName) =
                        await UploadLogoAsync(request.LoginBackgroundBase64, request.LoginBackgroundName, "LoginBackground", companyId, warnings);

                    bool anyUploaded = logo.PrintLogo != null || logo.AdminLogo != null || logo.AdminSmallLogo != null
                                    || logo.WaterMarkLogo != null || logo.BackgroundLogo != null;

                    // one call -> sp_CompanyLogo_Save (nothing to do when no image was picked)
                    if (anyUploaded)
                    {
                        var logoRes = await _companyClient.SaveCompanyLogosAsync(logo);
                        if (!logoRes.Success)
                            warnings.Add("Logos could not be saved: " + logoRes.Message);
                    }
                }
                catch (Exception ex)
                {
                    // the company itself IS saved - report the logo problem as a warning only
                    warnings.Add("Logos could not be saved: " + ex.Message);
                }
            }

            return Json(new
            {
                success = true,
                message = response.Message,
                warning = warnings.Count > 0 ? "Company saved, but: " + string.Join(" ", warnings) : null
            });
        }


        // Saves one image to disk; returns (url, type, name) or nulls when nothing was sent / it failed.
        private async Task<(string? Url, string? Type, string? Name)> UploadLogoAsync(
            string? base64, string? fileName, string prefix, int companyId, List<string> warnings)
        {
            if (string.IsNullOrWhiteSpace(base64)) return (null, null, null);

            // The prefix keeps the five images apart. If SaveBase64PhotoAsync builds the stored
            // name only from (module + id), the five files overwrite each other - make sure it
            // uses fileName (or a guid) as part of the name.
            string safeName = $"{prefix}_{Path.GetFileName(fileName ?? "image.png")}";

            var result = await _photoService.SaveBase64PhotoAsync(
                base64,                       // data URL from FileReader, same as your student photos
                safeName,
                PhotoModule.Company,
                FolderNameModule.Logo,
                companyId);

            if (!result.Success)
            {
                warnings.Add($"{prefix} could not be uploaded.");
                return (null, null, null);
            }

            return (result.PhotoUrl,
                    Path.GetExtension(safeName),          // stored in ...LogoType, e.g. ".png"
                    result.FileName ?? safeName);
        }

        /// <summary>
        /// Permanently removes a company from the records.
        /// Checks delete permission before deleting.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteCompany([FromBody] List<int> id)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete companies." });

            var response = await _companyClient.DeleteAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Gets the details of a specific company for viewing or editing.
        /// Checks edit permission before returning data.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCompany(int id)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit companies.", data = (object?)null });

            var response = await _companyClient.GetByIDAsync(id);
            return Json(new { success = response.Success, data = response.Data, message = response.Message });
        }

        /// <summary>
        /// Turns a company's active status on or off.
        /// Checks edit permission before toggling.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleCompanyStatus([FromBody] StatusUpdateRequest request)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change company status." });

            var response = await _companyClient.ToggleStatusAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Shows the main page for managing all user accounts in the system.
        /// Loads all users, roles, and user types for display.
        /// </summary>
        public async Task<IActionResult> Users()
        {
            ViewData["Title"] = "Users";
            
            var usersResponse = await _userClient.GetAllUsersAsync();
            var rolesResponse = await _userClient.GetRolesDropdownAsync();
            var typesResponse = await _userClient.GetUserTypesDropdownAsync();

            var model = new UsersPageViewModel
            {
                Users = usersResponse.Success ? usersResponse.Data : new List<UserViewModel>(),
                Roles = rolesResponse.Success ? rolesResponse.Data : new List<RoleViewModel>(),
                UserTypes = typesResponse.Success ? typesResponse.Data : new List<MstUserTypeViewModel>()
            };

            return View(model);
        }

        /// <summary>
        /// Saves a new user account or updates an existing one.
        /// Checks add/edit permission before saving.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveUser([FromBody] UserUpsertRequest request)
        {
            var isCreate = request.UserID <= 0;
            if (isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Add")).Data)
                return Json(new { success = false, message = "You do not have permission to add users." });
            if (!isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to edit users." });

            var response = await _userClient.SaveUserAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Turns a user account on or off.
        /// Checks edit permission before toggling.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus(int userId, bool isActive)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change user status." });

            var response = await _userClient.ToggleStatusAsync(userId, isActive);
            return Json(new { success = response.Success, message = response.Message });
        }

        /// <summary>
        /// Permanently removes a user account.
        /// Checks delete permission before deleting.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteUser(int id)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Delete")).Data)
                return Json(new { success = false, message = "You do not have permission to delete users." });

            var response = await _userClient.DeleteUserAsync(id);
            return Json(new { success = response.Success, message = response.Message });
        }

        #region Settings Fields & IDAutoGen API Proxy Endpoints

        [HttpGet]
        public async Task<IActionResult> GetAllFields(int companyId, int sessionId, bool? isSystemField = null, string belongsTo = null)
        {
            try
            {
                var res = await _settingsClient.GetAllFieldsAsync(companyId, sessionId, isSystemField, belongsTo);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message});
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> GetFieldByID(int id)
        {
            var res = await _settingsClient.GetFieldByIDAsync(id);
            return Json(res);
        }

        [HttpPost]
        public async Task<IActionResult> UpsertField([FromBody] FieldViewModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return Json(new { success = false, message = "Invalid model state" });
                if (model.CompanyID == 0 || model.CompanyID == null)
                {
                    model.CompanyID = await GetCompanyId();
                }
                if (model.SessionID == 0 || model.SessionID == null)
                {
                    model.SessionID = await GetSessionId();
                }
                var isCreate = model.FieldId <= 0;
                if (isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add fields." });
                if (!isCreate && !(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit fields." });

                var res = await _settingsClient.UpsertFieldAsync(model);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteField([FromBody]  List<int> id)
        {
            try
            {
                if (!(await _menuPerm.Has(SettingsMenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "You do not have permission to delete fields." });

                var res = await _settingsClient.DeleteFieldAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> ToggleFieldStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change field status." });

                var res = await _settingsClient.ToggleFieldStatusAsync(request);
                return Json(res);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> GetIDAutoGenSettings()
        {
            try
            {
                var companyId =await GetCompanyId();
                var sessionId =await GetSessionId();
                var res = await _settingsClient.GetIDAutoGenSettingsAsync(companyId,sessionId);
                return Json(res);
            }
            catch (Exception)
            {
                throw;
            }
           
        }

        [HttpPost]
        public async Task<IActionResult> SaveIDAutoGenSettings([FromBody] IDAutoGenRequest request)
        {
            if (!(await _menuPerm.Has(SettingsMenuPath, "Edit")).Data)
                return Json(new { success = false, message = "You do not have permission to change ID auto-generation settings." });
            if (request.CompanyID == 0 || request.CompanyID == null)
            {
                request.CompanyID = await GetCompanyId();
            }
            if (request.SessionID == 0 || request.SessionID == null)
            {
                request.SessionID = await GetSessionId();
            }
            var res = await _settingsClient.SaveIDAutoGenSettingsAsync(request);
            return Json(res);
        }

        #endregion


        [HttpPost]
        public async Task<IActionResult> CopyField([FromBody] CopyRequest request)
        {
            try
            {
                var response = await _settingsClient.CopyFieldAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
