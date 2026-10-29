using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebConsole.Controllers
{
    public class LibraryController : BaseController
    {
        private readonly ILibraryClientService _service;
        private readonly ICompanyClientService _companyService;
        private readonly IClassClientService _classService;
        private readonly ISectionClientService _sectionService;
        private readonly ISessionClientService _sessionService;
        private readonly IHumanResourceClientService _hrService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly ILibraryDocumentStatusClientService _libraryDocumentStatusClientService;
        private readonly ICurrencyClientService _currencyClientService;
        public LibraryController(
            ILibraryClientService service,
            ICompanyClientService companyService,
            IClassClientService classService,
            ISectionClientService sectionService,
            ISessionClientService sessionService,
            IHumanResourceClientService hrService,
            IConfiguration configuration,
            IPhotoUploadService photoService, PermissionHelper permHelper,
            ILibraryDocumentStatusClientService libraryDocumentStatusClientService, ICurrencyClientService currencyClientService) : base(permHelper)
        {
            _service = service;
            _companyService = companyService;
            _classService = classService;
            _sectionService = sectionService;
            _sessionService = sessionService;
            _hrService = hrService;
            _configuration = configuration;
            _photoService = photoService;
            _libraryDocumentStatusClientService = libraryDocumentStatusClientService;
            _currencyClientService = currencyClientService;
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

        #region Books
        // ==========================================================================
        // Books() action - server-side paging + full filter support
        // All filters (publisher, author, subject, category, language, series,
        // documentType, isActive) now flow through query string -> LibrarySearchRequest
        // -> stored procedure, exactly like pageIndex/search already did.
        // ==========================================================================
        public async Task<HRDepartmentPageViewModel> BuildLibraryBooksPageViewModel(
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId,
            int? publisherId,
            int? authorId,
            int? subjectId,
            int? categoryId,
            int? languageId,
            int? seriesId,
            int? documentId,
            bool? isActive,
            string? sortColumn,
            string? sortDir)
        {
            var model = new HRDepartmentPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Library/Books");

                var request = new LibrarySearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchText = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    PublisherID = publisherId,
                    AuthorID = authorId,
                    SubjectID = subjectId,
                    CategoryID = categoryId,
                    LanguageID = languageId,
                    SeriesID = seriesId,
                    DocumentID = documentId,
                    IsActive = isActive,
                    SortColumn = string.IsNullOrWhiteSpace(sortColumn) ? "BookID" : sortColumn,
                    SortDir = string.IsNullOrWhiteSpace(sortDir) ? "DESC" : sortDir
                };


                // Fire all lookups (grid data + every filter dropdown's option list) in parallel
                var libraryResponseTask = _service.GetAllLibraryWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();
                var publishersTask = _service.GetLibraryPublisherDropdownListAsync(request.CompanyID.Value);
                var authorsTask = _service.GetLibraryAuthorDropdownListAsync(request.CompanyID.Value);
                var subjectsTask = _service.GetLibrarySubjectDropdownListAsync(request.CompanyID.Value,0);   // all subjects, unfiltered by category, for the list-page filter
                var categoriesTask = _service.GetLibraryCategoryDropdownListAsync(request.CompanyID.Value);
                var languagesTask = _service.GetLibraryLanguageDropdownListAsync(request.CompanyID.Value);
                var seriesTask = _service.GetLibrarySeriesDropdownListAsync(request.CompanyID.Value);
                var documentTypesTask = _service.GetLibraryDocumentTypeDropdownListAsync(request.CompanyID.Value);

                await Task.WhenAll(
                    libraryResponseTask, companiesTask, publishersTask, authorsTask,
                    subjectsTask, categoriesTask, languagesTask, seriesTask, documentTypesTask);

                var pagedResult = await libraryResponseTask;

                model = new HRDepartmentPageViewModel
                {
                    ItemsBooks = pagedResult.Success ? pagedResult.Data.Data : new List<BookViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Publishers = (await publishersTask).Data ?? new(),
                    Authors = (await authorsTask).Data ?? new(),
                    Subjects = (await subjectsTask).Data ?? new(),
                    Categories = (await categoriesTask).Data ?? new(),
                    Languages = (await languagesTask).Data ?? new(),
                    SeriesList = (await seriesTask).Data ?? new(),
                    DocumentTypes = (await documentTypesTask).Data ?? new(),

                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,

                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    PublisherId = publisherId,
                    AuthorId = authorId,
                    SubjectId = subjectId,
                    CategoryId = categoryId,
                    LanguageId = languageId,
                    SeriesId = seriesId,
                    DocumentId = documentId,
                    IsActiveFilter = isActive,
                    SortColumn = request.SortColumn,
                    SortDir = request.SortDir
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


        public async Task<IActionResult> Books(
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId,
            int? publisherId,
            int? authorId,
            int? subjectId,
            int? categoryId,
            int? languageId,
            int? seriesId,
            int? documentId,
            bool? isActive,
            string? sortColumn,
            string? sortDir)
        {
            var model = new HRDepartmentPageViewModel();
            try
            {
                model = await BuildLibraryBooksPageViewModel(pageIndex, pageSize, search, companyId,
                    publisherId, authorId, subjectId, categoryId, languageId, seriesId, documentId, isActive, sortColumn, sortDir);

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
        public async Task<IActionResult> GetLibraryBooksPartial(
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId,
            int? publisherId,
            int? authorId,
            int? subjectId,
            int? categoryId,
            int? languageId,
            int? seriesId,
            int? documentId,
            bool? isActive,
            string? sortColumn,
            string? sortDir)
        {
            try
            {
                var model = await BuildLibraryBooksPageViewModel(pageIndex, pageSize, search, companyId, 
                    publisherId, authorId, subjectId, categoryId, languageId, seriesId, documentId, isActive, sortColumn, sortDir);

                return PartialView("_LibraryBooksTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibraryBooksTablePartial", new HRDepartmentPageViewModel());
            }
        }



        // ==========================================================================
        // LibrarySearchRequest - unchanged from what you already have, included here
        // only for reference (fixed SearchText naming to match what's used above).
        // ==========================================================================
        public async Task<IActionResult> AddBooks(int? id)
        {
            var model = new HRDepartmentAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/Books"
               );
                var sessionId = await GetSessionId();
                
                var documentType = await _service.GetLibraryDocumentTypeDropdownListAsync(await GetCompanyId());
                var documentStatus = await _service.GetLibraryDocumentStatusDropdownListAsync(await GetCompanyId());
                var category = await _service.GetLibraryCategoryDropdownListAsync(await GetCompanyId());
                var language = await _service.GetLibraryLanguageDropdownListAsync(await GetCompanyId());
                var series = await _service.GetLibrarySeriesDropdownListAsync(await GetCompanyId());
                var publisher = await _service.GetLibraryPublisherDropdownListAsync(await GetCompanyId());
                var author = await _service.GetLibraryAuthorDropdownListAsync(await GetCompanyId());
                var budget = await _service.GetLibraryBudgetDropdownListAsync(await GetCompanyId());
                var supplier = await _service.GetLibrarySupplierDropdownList(await GetCompanyId());
                var getCurrency = await _currencyClientService.GetCurrencyByCompanyIdAsync(await GetCompanyId());
                if(getCurrency != null) 
                {
                    model.CurrencySymbol = getCurrency.Data?.CurrencySymbol;
                }
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _service.GetBookByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.ItemsBooks = response.Data;
                        model.EditBooks = response.Data;
                    }
                }
                else
                {
                    model.EditBooks = null;
                }
                model.DocumentType = documentType.Data;
                model.DocumentStatus = documentStatus.Data;
                model.Category = category.Data;
                model.Language = language.Data;
                model.Series = series.Data;
                model.Publisher = publisher.Data;
                model.Author = author.Data;
                model.Budget = budget.Data;
                model.Supplier = supplier.Data;
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
        /// Returns a list of books matching the search term as JSON.
        /// Use this for AJAX dropdowns or autocomplete.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBookList(string? search)
        {
            try
            {
                var response = await _service.GetBookListAsync(await GetCompanyId(), search);
                return Json(new { response.Success, response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Retrieves a book by its unique ID as JSON.
        /// Use this to fetch book details for editing or display.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBook(int id)
        {
            try
            {
                var response = await _service.GetBookByIdAsync(id);
                return Json(new { success = response.Success != null, response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Creates or updates a book record, including handling file uploads for book cover or attachments.
        /// Use this to add a new book or edit an existing one.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertBook([FromForm] BookUpsertRequest req, IFormFile? attachmentFile)
        {
            try
            {
                var companyId = await GetCompanyId();
                if (companyId <= 0)
                    return Json(new { success = false, message = "Valid Company ID required." });

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long maxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = maxFileSizeMB * 1024L * 1024L;
                    if (attachmentFile.Length > maxBytes)
                        return Json(new { success = false, message = $"File size exceeds the {maxFileSizeMB} MB limit." });

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;
                }
                req.CompanyID = await GetCompanyId();
                
                var res = await _service.UpsertBookAsync(req);

                if (res.Data?.Result?.Result == 1)
                {
                    int? bookId = res.Data.Result.BookId;
                    if (attachmentFile != null && attachmentFile.Length > 0 && bookId.HasValue)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);
                        byte[] fileBytes = memoryStream.ToArray();

                        var photoResult = await _photoService.SaveBase64PhotoAsync(
                            Convert.ToBase64String(fileBytes),
                            req.FileName ?? "photo.jpg",
                            PhotoModule.BookCoverPage,
                            FolderNameModule.Documents,
                            bookId.Value
                        );

                        var attachmentReq = new BooksAttachmentUpsertRequest
                        {
                            BookId = bookId.Value,
                            Attachment = photoResult.PhotoUrl,
                            FileName = photoResult.FileName,
                            FileType = attachmentFile.ContentType
                        };
                        await _service.UpsertBooksFrontPageAttachmentFileAsync(attachmentReq);
                    }
                    if (req.RemoveAttachment==true)
                    {
                        var attachmentReq = new BooksAttachmentUpsertRequest
                        {
                            BookId = bookId.Value,
                            Attachment = null,
                            FileName = null,
                            FileType = null
                        };
                        attachmentReq.RemoveAttachment = req.RemoveAttachment;
                        await _service.UpsertBooksFrontPageAttachmentFileAsync(attachmentReq);
                    }
                }

                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                // Log ex — don't rethrow a raw exception out of an AJAX endpoint,
                // the caller will just see a generic 500 with no useful `message`.
                return Json(new { success = false, message = "An unexpected error occurred while saving the book." });
            }
        }

        /// <summary>
        /// Deletes one or more books by their IDs.
        /// Use this to remove books from the library catalog.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteBook([FromBody] List<int> id)
        {
            try
            {
                var res = await _service.DeleteBookAsync(id);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
           
        }

        /// <summary>
        /// Toggles the active status (enable/disable) of one or more books.
        /// Use this to activate or deactivate books without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _service.ToggleBookStatusAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        #endregion

        #region Membership

        /// <summary>
        /// Displays the student membership management page, allowing you to add or view student library members.
        /// Supports filtering by class, section, and search term.
        /// </summary>
        public async Task<HRStudentsMembershipPageViewModel> BuildStudentsPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? sectionId,
        int? classId)
        {
            var model = new HRStudentsMembershipPageViewModel();
            var models = new HRStudentsMembershipPageViewModel { };
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddStudents"
               );


                var request = new StudentsMembershipSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionId = sessionId ?? await GetSessionId(),
                    SectionId = sectionId ?? null,
                    ClassId=classId??null
                };


                
                var session = await _sessionService.GetByIDAsync(await GetSessionId());
                var studentMemberResponse = _service.GetAllStudentsMembershipWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false,request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                var classResponse = await _classService.GetAllAsync(false, await GetSessionId(),request.CompanyID);


                await Task.WhenAll(studentMemberResponse, sessionTask, companiesTask);

                var pagedResult = await studentMemberResponse;


                model = new HRStudentsMembershipPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<LibraryMemberViewModel>(),
                    Classes = classResponse.Success ? classResponse.Data : new List<MstClassViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = companyId,
                    SectionId = sectionId,
                    ClassId=classId
                };
                model.SessionYear = session.Data?.SessionTitle;
                model.Permissions = perms;
                //var companyId = await GetCompanyId();
               // var sessionId = await GetSessionId();
                //ViewBag.Classes = (await _classService.GetAllAsync(false, sessionId)).Data;
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
           
        }

        


        public async Task<IActionResult> AddStudents(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? sectionId,
        int? classId)
        {
            var model = new HRStudentsMembershipPageViewModel();
            try
            {
                model = await BuildStudentsPageViewModel(pageIndex, pageSize, search, companyId, sessionId, sectionId, classId);

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
        public async Task<IActionResult> GetStudentsPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionId,
        int? sectionId,
        int? classId)
        {
            try
            {
                var model = await BuildStudentsPageViewModel(pageIndex, pageSize, search, companyId, sessionId, sectionId, classId);

                return PartialView("_StudentsMembershipTable", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StudentsMembershipTable", new HRStudentsMembershipPageViewModel());
            }
        }

        /// <summary>
        /// Shows the add/edit form for a student library membership.
        /// Use this to assign or edit library membership for a student.
        /// </summary>
        public async Task<IActionResult> AddLibraryStudentsMembership(int? id, int? studentId)
        {
            var model = new HRStudentsMembershipAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddLibraryStudentsMembership"
               );
                
                var session = await _sessionService.GetByIDAsync(await GetSessionId());
                var classes = await _classService.GetAllAsync(false,await GetSessionId());
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _service.GetLibraryMemberByID(id.Value);
                    if (response.Success)
                    {
                        model.EditItem = response.Data;
                    }
                }
                else
                {
                    model.EditItem = null;
                }
                model.CurrentSession = session.Data?.SessionTitle;
                model.Classes = classes.Data;
                model.StudentId = studentId;
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
        /// Displays the staff membership management page, allowing you to add or view staff library members.
        /// Supports filtering by department and search term.
        /// </summary>
        public async Task<StaffMemberPageViewModel> BuildStaffsPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? departmentID)
        {
            var model = new StaffMemberPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddStaff"
               );
                var request = new StaffLibraryMemberSearchModel
                {
                    PageIndex = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchTerm = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    DepartmentID = departmentID ?? null
                };

                int sessionId = await GetSessionId();
                var models = new StaffMemberPageViewModel { };
                var session = await _sessionService.GetByIDAsync(await GetSessionId());
                var staffMemberResponse = _service.GetAllStaffMembershipWithPageAsync(request);

                var departmet = await _hrService.GetAllDepartmentsAsync(request.CompanyID, sessionId);
                var companiesTask = _companyService.GetAllAsync();


                await Task.WhenAll(staffMemberResponse, companiesTask);

                var pagedResult = await staffMemberResponse;


                model = new StaffMemberPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<StaffLibraryMember>(),
                    Departments = departmet.Success ? departmet.Data.Data : new List<HRDepartmentViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = companyId,
                    DepartmentID = departmentID
                };
                model.SessionYear = session.Data.SessionTitle;
                model.Permissions = perms;
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }            

        }



        public async Task<IActionResult> AddStaff(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? departmentID)
        {
            var model = new StaffMemberPageViewModel();
            try
            {
                model = await BuildStaffsPageViewModel(pageIndex, pageSize, search, companyId, departmentID);

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
        public async Task<IActionResult> GetAddStaffPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? departmentID)
        {
            try
            {
                var model = await BuildStaffsPageViewModel(pageIndex, pageSize, search, companyId, departmentID);

                return PartialView("_StaffsMembershipTable", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StaffsMembershipTable", new StaffMemberPageViewModel());
            }
        }

        /// <summary>
        /// Shows the add/edit form for a staff library membership.
        /// Use this to assign or edit library membership for a staff member.
        /// </summary>
        public async Task<IActionResult> AddLibraryStaffMembership(int? id, int? staffId)
        {
            var model = new HRStudentsMembershipAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddLibraryStaffMembership"
               );
                
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _service.GetLibraryMemberByID(id.Value);
                    if (response.Success)
                    {
                        model.EditItem = response.Data;
                    }
                }
                else
                {
                    model.EditItem = null;
                }
                model.StaffId = staffId;
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
        /// Returns a list of library members (students or staff) matching the filters as JSON.
        /// Use this for AJAX grids or dropdowns.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMemberList(string type, int? classId, int? sectionId, int? deptId, string? search)
        {
            try
            {
                var response = await _service.GetMemberListAsync(type, await GetCompanyId(), classId, sectionId, deptId, search);
                return Json(new { response.Success, response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
           
        }

        /// <summary>
        /// Searches for library members (students or staff) by filters and search term.
        /// Use this for member selection or assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> SearchForMembership(string type, int? classId, int? sectionId, int? deptId, string? search)
        {
            try
            {
                var response = await _service.SearchForMembershipAsync(type, await GetCompanyId(), classId, sectionId, deptId, search);
                return Json(new { response.Success, response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Adds or updates a library member (student or staff).
        /// Use this to assign library cards or update member details.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AddMember([FromBody] LibraryMemberUpsertRequest req)
        {
            try
            {
                var res = await _service.AddMemberAsync(req, await GetCompanyId(), GetUserId());
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
           
        }

        /// <summary>
        /// Deletes a library member by their ID, with support for both student and staff members.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteMember(int id, int? studentId, int? staffId,string? modeType)
        {
            try
            {
                if (studentId.HasValue || staffId.HasValue)
                {
                    // Custom delete via SP update
                    var companyId = GetCompanyId();
                    var userId = GetUserId();
                    var res = await _service.DeleteMemberExAsync(id, studentId, staffId, modeType);
                    return Json(new { success = res.Success, message = res.Message });
                }
                else
                {
                    var res = await _service.DeleteMember(id, GetUserId());
                    return Json(new { success = res.Success, message = res.Message });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }
        #endregion

        /// <summary>
        /// Returns all sections for a given class as JSON.
        /// Use this to populate section dropdowns.
        /// </summary>
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
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Displays the library member management page with pagination and filtering.
        /// Use this to view and manage all library members.
        /// </summary>
        public async Task<MemberPageViewModel> BuildLibraryMemberPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new MemberPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library"
               );

                var request = new MemberSearchModel
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchkeyWord = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };


                var sessionId = await GetSessionId();
                var libraryResponse = _service.GetAllLibraryMemberWithPageIndexAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(libraryResponse, companiesTask);

                var pagedResult = await libraryResponse;

                model = new MemberPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<LibraryMemberViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID
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

        public async Task<IActionResult> Member(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new MemberPageViewModel();
            try
            {
                model = await BuildLibraryMemberPageViewModel(pageIndex, pageSize, search, companyId);

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
        public async Task<IActionResult> GetLibraryMemberPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildLibraryMemberPageViewModel(pageIndex, pageSize, search, companyId);

                return PartialView("_LibraryMemberTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibraryMemberTablePartial", new MemberPageViewModel());
            }
        }

        /// <summary>
        /// Displays the issue/return page for a library member, showing all issued books and their status.
        /// Use this to manage book issues and returns for a member.
        /// </summary>
        [SkipPermissionCheck]
        public async Task<IActionResult> Issueold(int id, int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new IssuePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/Issue"
               );


                var request = new IssueBookSearchModel
                {
                    LibraryMemberID=id,
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 5,
                    SearchkeyWord = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };


                
                if (id <= 0) return RedirectToAction("Member");
                if (id > 0)
                {

                    var issueBookResponse = _service.GetAllIssuedBooksWithPageIndexAsync(request);

                    var companiesTask = _companyService.GetAllAsync();

                    var classResponse = await _classService.GetAllAsync(false, await GetSessionId());


                    await Task.WhenAll(issueBookResponse,  companiesTask);

                    var pagedResult = await issueBookResponse;

                    
                    var response =await _service.GetMemberDetails(id,await GetCompanyId());
                    var issueResponse =await _service.GetIssuedBooks(id, await GetCompanyId());

                    model = new IssuePageViewModel
                    {
                        IssueReturn = pagedResult.Success ? pagedResult.Data.Data : new List<IssueReturnViewModel>(),
                        MemberDetails = response.Success ? response.Data : new MemberDetailsViewModel(),
                        Companies = (await companiesTask).Data ?? new(),
                        TotalRecords = pagedResult.Data.TotalRecords,
                        PageNumber = pagedResult.Data.PageNumber,
                        PageSize = pagedResult.Data.PageSize,
                        SearchTerm = search,
                        CompanyId = request.CompanyID,
                        LibraryMemberID = id
                    };

                }

                model.Permissions = perms;
                ViewBag.LibraryMemberID = id;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }

        /// <summary>
        /// Builds the view model for the Issue/Return books page for a given library member.
        /// Supports paging and searching through issued books.
        /// </summary>
        private async Task<IssuePageViewModel> BuildIssuePageViewModel(int id,
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId)
        {
            var model = new IssuePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/Library/Issue");

                var request = new IssueBookSearchModel
                {
                    LibraryMemberID = id,
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 5,
                    SearchkeyWord = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                if (id <= 0)
                {
                    model.Permissions = perms;
                    return model;
                }

                var issueBookResponse = _service.GetAllIssuedBooksWithPageIndexAsync(request);
                var companiesTask = _companyService.GetAllAsync();
                var classResponse = await _classService.GetAllAsync(false, await GetSessionId());
                await Task.WhenAll(issueBookResponse, companiesTask);

                var pagedResult = await issueBookResponse;
                var response = await _service.GetMemberDetails(id, await GetCompanyId());

                model = new IssuePageViewModel
                {
                    IssueReturn = pagedResult.Success ? pagedResult.Data.Data : new List<IssueReturnViewModel>(),
                    MemberDetails = response.Success ? response.Data : new MemberDetailsViewModel(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    LibraryMemberID = id
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

        [SkipPermissionCheck]
        public async Task<IActionResult> Issue(int id, int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId)
        {
            if (id <= 0) return RedirectToAction("Member");

            var model = await BuildIssuePageViewModel(id, pageIndex, pageSize, search, companyId);
            ViewBag.LibraryMemberID = id;
            return View(model);
        }

        // ✅ NEW — AJAX endpoint, returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetIssuePartial(int id,
            int? pageIndex,
            int? pageSize,
            string? search,
            int? companyId)
        {
            try
            {
                var model = await BuildIssuePageViewModel(id, pageIndex, pageSize, search, companyId);
                return PartialView("_IssuedBooksTable", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_IssuedBooksTable", new IssuePageViewModel { LibraryMemberID = id });
            }
        }

        /// <summary>
        /// Retrieves detailed information about a library member as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMemberDetails(int id)
        {
            try
            {
                var data = await _service.GetMemberDetails(id, await GetCompanyId());
                return Json(new { success = data != null, data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
           
        }

        /// <summary>
        /// Retrieves all books currently issued to a library member as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetIssuedBooks(int memberId)
        {
            try
            {
                var data = _service.GetIssuedBooks(memberId, await GetCompanyId());
                return Json(new { success = true, data.Result.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Issues a book to a library member.
        /// Use this to record a new book issue transaction.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> IssueBook([FromBody] IssueReturnUpsertRequest req)
        {
            try
            {
                var res = await _service.IssueBook(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the add issue book form for a member, preparing book lists and document status options.
        /// </summary>
        public async Task<IActionResult> AddIssueBook(int? id)
        {
            var model = new IssueBookAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddIssueBook"
               );
                string search = string.Empty;
                var response = await _service.GetBookListAsync(await GetCompanyId(), search);
                var documentStatus = await _service.GetLibraryDocumentStatusDropdownListAsync(await GetCompanyId());
                var issueResponce = await _service.GetIssueNoAsync(await GetCompanyId());
                model = new IssueBookAddViewModel
                {
                    BookViewModels = response.Data,
                    Permissions = perms,
                    LibraryMemberID = id,
                    DocumentStatus = documentStatus.Data,
                    IssueNo= issueResponce.Data.IssueNo
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
        /// Shows the add/edit form for returning a book, including all issued books for the member.
        /// </summary>
        public async Task<IActionResult> AddIssueBookReturn(int? issueReturnID, int libraryMemberID, int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new IssueBookAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/AddIssueBook"
               );

                var request = new IssueBookSearchModel
                {
                    LibraryMemberID = libraryMemberID,
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 5,
                    SearchkeyWord = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };


              //  var model = new IssuePageViewModel();
                
               var issueBookResponse = _service.GetAllIssuedBooksWithPageIndexAsync(request);
                await Task.WhenAll(issueBookResponse);

                var pagedResult = await issueBookResponse;
                var response = await _service.GetBookListAsync(await GetCompanyId(), string.Empty);
                var getDocument = await _libraryDocumentStatusClientService.GetAllAsync(await GetCompanyId());
                model = new IssueBookAddViewModel
                {
                    BookReturnViewModels = pagedResult.Success ? pagedResult.Data.Data : new List<IssueReturnViewModel>(),
                    // BookViewModels = issueBookResponse.Data,
                    Permissions = perms,
                    LibraryMemberID = libraryMemberID,
                    IssueReturnID = issueReturnID,
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = companyId,
                    Status = getDocument.Data
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
        /// Displays detailed information about a specific book, including all metadata and attachments.
        /// </summary>
        [SkipPermissionCheck]
        public async Task<IActionResult> BookDetails(int? id)
        {
            var model = new BookDetailsResult();
            try
            {
               
                var perms = await GetPermissions(
                   "/Library/view"
               );

                if (id == null || id <= 0)
                    return RedirectToAction("Books");

                var response = await _service.GetBookDetailsAsync(id.Value);

                if (!response.Success || response.Data?.Book == null)
                {
                    // TempData works well here since the target view has no model
                    // to attach an inline error to before it even renders.
                    TempData["ErrorMessage"] = response.Message ?? "Book not found.";
                    return RedirectToAction("Books");
                }
                
                model = response.Data;
                var getCurrency = await _currencyClientService.GetCurrencyByCompanyIdAsync(await GetCompanyId());
                if (getCurrency != null)
                {
                    model.CurrencySymbol = getCurrency.Data?.CurrencySymbol;
                }
                model.Permissions = perms;
                // View gets the unwrapped BookDetailsResult, not the ApiResponse wrapper —
                // the ApiResponse envelope (Success/Message) is only useful at the point
                // you're deciding whether to render the page at all, which is here.
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Marks a book as returned for a given issue transaction.
        /// Use this to complete the return process for a book.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ReturnBook(int issueId, DateTime returnDate)
        {
            try
            {
                ReturnBookIssue req = new ReturnBookIssue();
                req.issueId = issueId;
                req.returnDate = returnDate;
                var res = await _service.ReturnBook(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Shows the import book page for uploading book data via CSV.
        /// </summary>
        public IActionResult ImportBook()
        {
            try
            {
                return View();
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View();
            }
            
        }

        /// <summary>
        /// Imports book data from a CSV file and creates book records in bulk.
        /// Use this to quickly add multiple books to the library.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ImportBook(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return Json(new { success = false, message = "Please select a CSV file." });

            try
            {
                var companyId = await GetCompanyId();
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

                    var values = line.Split(',').Select(v => v.Trim()).ToList();
                    var req = new BookUpsertRequest();

                    for (int i = 0; i < headers.Count && i < values.Count; i++)
                    {
                        string header = headers[i];
                        string value = values[i];

                        switch (header)
                        {
                            case "book_title": req.BookTitle = value; break;
                            case "book_no": req.BookNo = value; break;
                            case "isbn_no": req.ISBNNo = value; break;
                            case "subject": req.SubjectId = int.TryParse(value, out var subject) ? subject : 0; break;
                            case "rack_no": req.RackNo = value; break;
                            case "publish": req.PublisherId = int.TryParse(value, out var publish) ? publish : 0; break;
                            //case "author": req.AuthorId = int.TryParse(value, out var AuthorId) ? AuthorId : 0; break;
                            case "qty": req.TotalQty = int.TryParse(value, out var qty) ? qty : 0; break;
                            case "perunitcost": req.BookPrice = decimal.TryParse(value, out var price) ? price : 0; break;
                            case "postdate": req.PostDate = DateTime.TryParse(value, out var date) ? date : (DateTime?)null; break;
                            case "description": req.Description = value; break;
                        }
                    }

                    var res =await _service.UpsertBookAsync(req);
                    results.Add(new
                    {
                        bookTitle = req.BookTitle,
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


        /// <summary>
        /// Retrieves the list of subjects for a given category as JSON.
        /// Use this to populate subject dropdowns in the UI.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLibrarySubjectDropdownList(int categoryId)
        {
            try
            {
                var data = _service.GetLibrarySubjectDropdownListAsync(await GetCompanyId(), categoryId);
                return Json(new { success = true, data.Result.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message=ex.Message });
            }
            
        }

        /// <summary>
        /// Searches for book titles matching a search term.
        /// Use this for autocomplete or quick search features.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> SearchBookTitle(string term)
        {
            try
            {
                int companyId = await GetCompanyId();
                var response = await _service.SearchBookTitleAsync(term, companyId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Retrieves detailed information about a book by its ID as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBookDetails(int id)
        {
            try
            {
                var response = await _service.GetBookByIdAsync(id);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
        }


        /// <summary>
        /// Displays the accession register page, showing all book accession records with pagination and filtering.
        /// Use this to manage book accession entries.
        /// </summary>
        public async Task<AccessionPageViewModel> BuildLibraryAccessionPageViewModel(int? pageIndex,
        int? pageSize,
        int? bookId,
        string? search,
        int? companyId)
        {
            var model = new AccessionPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/Books"
               );

                var request = new LibrarySearchRequest
                {
                    PageNumber = (pageIndex.HasValue && pageIndex.Value > 0) ? pageIndex.Value : 1,
                    PageSize = (pageSize.HasValue && pageSize.Value > 0) ? pageSize.Value : 10,
                    SearchText = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    BookId=bookId??null
                };


                var sessionId = await GetSessionId();
                var libraryResponse = _service.GetAllAccessionWithPageAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(libraryResponse, companiesTask);

                var pagedResult = await libraryResponse;
                var bookData = await _service.GetBookListAsync(await GetCompanyId(), search);
                model = new AccessionPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<AccessionDetailsModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = request.PageNumber,   // ✅ use what was requested
                    PageSize = request.PageSize,       // ✅ use what was requested
                    SearchTerm = search,
                    ItemsBooks = bookData.Data,
                    CompanyId = request.CompanyID
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

        public async Task<IActionResult> Accession(int? pageIndex,
        int? pageSize,
        int? bookId,
        string? search,
        int? companyId)
        {
            var model = new AccessionPageViewModel();
            try
            {
                model = await BuildLibraryAccessionPageViewModel(pageIndex, pageSize, bookId, search, companyId);

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
        public async Task<IActionResult> GetLibraryAccessionPartial(int? pageIndex,
        int? pageSize,
        int? bookId,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildLibraryAccessionPageViewModel(pageIndex, pageSize, bookId, search, companyId);

                return PartialView("_LibraryAccessionTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_LibraryAccessionTablePartial", new AccessionPageViewModel());
            }
        }


        /// <summary>
        /// Shows the add/edit form for accession status, allowing you to update the status of a book accession.
        /// </summary>
        public async Task<IActionResult> AddAccessionStatus(int? id)
        {
            var model = new AccessionAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/Books"
               );
                var sessionId = await GetSessionId();
              
                var documentStatus = await _service.GetLibraryDocumentStatusDropdownListAsync(await GetCompanyId());
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _service.GetAccessionById(id.Value,await GetCompanyId());
                    if (response.Success)
                    {
                        model.Items = response.Data;
                    }
                }
                else
                {
                    model.Items = null;
                }
                model.DocumentStatus = documentStatus.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception  ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Retrieves accession details by accession number as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAccessionById(string accessionNo)
        {
            try
            {
                var response = await _service.GetAccessionByNo(accessionNo,await GetCompanyId());
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                throw;
            }
        }


        /// <summary>
        /// Updates the status of a book accession (e.g., available, lost, damaged).
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpdateAccessionStatus([FromBody] AccessionStatusUpsertRequest req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                var response = await _service.UpsertAccessionStatusAsync(req);
                return Json(new { success = response.Success,message=response.Message, data = response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /// <summary>
        /// Displays the barcode labels page for printing book accession barcodes.
        /// Use this to generate and print barcode labels for books.
        /// </summary>
        public async Task<IActionResult> BarCodeLabels(string? mode,
        string? from,
        string? to,
        string? accessionNo,
        int? companyId)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Library/BarCodeLabels"
               );

                var request = new AccessionSearchRequest
                {
                    Mode = mode ??null,
                    CompanyId = companyId ?? await GetCompanyId(),
                    FromAccessionNo = from,
                    ToAccessionNo = to ?? null,
                    AccessionNo = accessionNo ?? null
                };


                var sessionId = await GetSessionId();
                var libraryResponse = _service.GetAccessionForLabelsAsync(request);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(libraryResponse, companiesTask);

                var pagedResult = await libraryResponse;
                var model = new BarCodeLabelsPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data : new List<AccessionDetailsModel>(),
                    Mode = mode ?? null,
                    CompanyId = companyId ?? await GetCompanyId(),
                    FromAccessionNo = from,
                    ToAccessionNo = to ?? null,
                    AccessionNo = accessionNo ?? null
                };
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Retrieves accession records for barcode label generation as JSON.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAccessionForLabels(string? mode,
        string? from,
        string? to,
        string? accessionNo,
        int? companyId)
        {
            try
            {
                var request = new AccessionSearchRequest
                {
                    Mode = mode ?? null,
                    CompanyId = companyId ?? await GetCompanyId(),
                    FromAccessionNo = from,
                    ToAccessionNo = to ?? null,
                    AccessionNo = accessionNo ?? null
                };
                var response = await _service.GetAccessionForLabelsAsync(request);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
        }


        /// <summary>
        /// Saves a new book issue transaction.
        /// Use this to record the issuance of a book to a member.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveIssueBook([FromBody] LibraryIssueSaveRequest req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                req.IssueDate = DateTime.Now;
                var res = await _service.SaveIssueBook(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Records the return of a book for a given issue transaction.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ReturnIssueBook([FromBody] LibraryReturnRequest req)
        {
            try
            {
                req.CompanyID = await GetCompanyId();
                var res = await _service.ReturnIssueBook(req);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Adds multiple student memberships in bulk, assigning library cards to many students at once.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AddStudentsMembershipBulk([FromBody] BulkMembershipRequest req)
        {
            try
            {
                var res = await _service.AddStudentsMembershipBulkWithCards(req, await GetCompanyId(), GetUserId());
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
            
        }

        /// <summary>
        /// Searches for library members by type and search text.
        /// Use this for quick member lookup or assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> SearchMember(string memberType, string? searchText)
        {
            try
            {
                var res = await _service.SearchMemberAsync(await GetCompanyId(), memberType, searchText);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Searches for book accession numbers matching a search text.
        /// Use this for quick accession lookup or assignment.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> SearchAccession(string? searchText)
        {
            try
            {
                var res = await _service.SearchAccessionNoAsync(await GetCompanyId(),  searchText);
                return Json(new { success = res.Success, data = res.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Retrieves all books issued to a member, with pagination and optional accession number filtering.
        /// Use this to display issued books for a member.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetIssuedBooksByMember(
    int libraryMemberID,
    string ? accessionNo,
    int? pageIndex,
    int? pageSize,
    string? search)
        {
            try
            {
                if (libraryMemberID <= 0)
                    return Json(new { success = false, message = "Invalid member id." });

                var request = new IssueBookSearchModel
                {
                    LibraryMemberID = libraryMemberID,
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 5,
                    SearchkeyWord = search,
                    CompanyID = await GetCompanyId(),
                    AccessionNo=accessionNo?? null
                };

                var pagedResult = await _service.GetAllIssuedBooksWithPageIndexAsync(request);

                if (!pagedResult.Success)
                    return Json(new { success = false, message = pagedResult.Message ?? "Failed to load issued books." });

                var items = (pagedResult.Data?.Data ?? new List<IssueReturnViewModel>());

                return Json(new
                {
                    success = true,
                    data = items,
                    totalRecords = pagedResult.Data?.TotalRecords ?? 0,
                    pageNumber = pagedResult.Data?.PageNumber ?? 1,
                    pageSize = pagedResult.Data?.PageSize ?? (pageSize ?? 5)
                });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Error: " + ex.Message });
            }
        }
    }
}
