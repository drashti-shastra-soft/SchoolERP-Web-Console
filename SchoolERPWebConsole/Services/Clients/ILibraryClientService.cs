using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryClientService
    {
        /// <summary>
        /// Retrieves the list of books for the specified company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="searchTerm">Optional search text.</param>
        /// <returns>A collection of books.</returns>
        Task<ApiResponse<List<BookViewModel>>> GetBookListAsync(
            int companyId,
            string? searchTerm);

        /// <summary>
        /// Retrieves a specific book by its identifier.
        /// </summary>
        /// <param name="id">The book identifier.</param>
        /// <returns>The requested book.</returns>
        Task<ApiResponse<BookViewModel>> GetBookByIdAsync(int id);

        /// <summary>
        /// Creates or updates a library book.
        /// </summary>
        /// <param name="request">Book details.</param>
        /// <returns>
        /// API response indicating whether the operation succeeded.
        /// </returns>
        Task<ApiResponse<UpsertBookResponse>> UpsertBookAsync(BookUpsertRequest request);

        /// <summary>
        /// Deletes a library book.
        /// </summary>
        /// <param name="id">Book identifier.</param>
        /// <returns>
        /// API response indicating whether the operation succeeded.
        /// </returns>
        Task<ApiResponse<bool>> DeleteBookAsync(List<int> id);

        /// <summary>
        /// Changes the active/inactive status of a library book.
        /// </summary>
        /// <param name="id">Book identifier.</param>
        /// <returns>
        /// API response indicating whether the operation succeeded.
        /// </returns>
        Task<ApiResponse<bool>> ToggleBookStatusAsync(StatusUpdateRequest request);

        /// <summary>
        /// Retrieves library members based on the supplied filters.
        /// </summary>
        /// <param name="memberType">The type of library member (Student, Staff, or All).</param>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="classId">Optional class filter.</param>
        /// <param name="sectionId">Optional section filter.</param>
        /// <param name="departmentId">Optional department filter.</param>
        /// <param name="search">Optional search term.</param>
        /// <returns>A collection of matching library members.</returns>
        Task<ApiResponse<List<LibraryMemberViewModel>>> GetMemberListAsync(
    string memberType,
    int companyId,
    int? classId,
    int? sectionId,
    int? departmentId,
    string? search);

        /// <summary>
        /// Searches students or staff members for library membership registration.
        /// </summary>
        /// <param name="memberType">The type of member to search (Student or Staff).</param>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="classId">Optional class filter.</param>
        /// <param name="sectionId">Optional section filter.</param>
        /// <param name="departmentId">Optional department filter.</param>
        /// <param name="search">Optional search term.</param>
        /// <returns>A collection of matching membership prospects.</returns>
        Task<ApiResponse<List<MembershipSearchViewModel>>> SearchForMembershipAsync(
            string memberType,
            int companyId,
            int? classId,
            int? sectionId,
            int? departmentId,
            string? search);

        /// <summary>
        /// Registers a new library member.
        /// </summary>
        /// <param name="request">The library member upsert request.</param>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="userId">The user identifier performing the action.</param>
        /// <returns>API response containing the operation result.</returns>
        Task<ApiResponse<object>> AddMemberAsync(
            LibraryMemberUpsertRequest request,
            int companyId,
            int userId);

        /// <summary>
        /// Deletes a library member.
        /// </summary>
        Task<ApiResponse<bool>> DeleteMember(
            int id,
            int userId);

       

        /// <summary>
        /// Retrieves all books currently issued to a library member.
        /// </summary>
        Task<ApiResponse<List<IssueReturnViewModel>>> GetIssuedBooks(
            int memberId,
            int companyId);

        /// <summary>
        /// Provides methods for managing library book issue and return operations through API calls.
        /// </summary>
        
            /// <summary>
            /// Issues a book to a library member.
            /// </summary>
            Task<ApiResponse<bool>> IssueBook(IssueReturnUpsertRequest request);

            /// <summary>
            /// Records the return of an issued book.
            /// </summary>
            Task<ApiResponse<bool>> ReturnBook(ReturnBookIssue req);

            /// <summary>
            /// Retrieves detailed information about a library member.
            /// </summary>
            Task<ApiResponse<MemberDetailsViewModel>> GetMemberDetails(int memberId, int companyId);

        /// <summary>
        /// Deletes a library member.
        /// </summary>
        /// <param name="id">Library member identifier.</param>
        /// <param name="studentId">Student identifier.</param>
        /// <param name="staffId">Staff identifier.</param>
        /// <returns>Operation result.</returns>
        Task<ApiResponse<dynamic>> DeleteMemberExAsync(
            int id,
            int? studentId,
            int? staffId, string? modeType);

        /// <summary>
        /// Retrieves a paginated list of classes based on the specified search criteria.
        /// Automatically resolves the current user's Company and Session if they are not provided.
        /// </summary>
        Task<ApiResponse<PagedResult<BookViewModel>>> GetAllLibraryWithPageAsync(LibrarySearchRequest request);
        /// <summary>
        /// Retrieves a paginated list of student library memberships based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of library members.</returns>
        Task<ApiResponse<PagedResult<LibraryMemberViewModel>>> GetAllStudentsMembershipWithPageAsync(StudentsMembershipSearchRequest request);

        /// <summary>
        /// Retrieves details of a library member by their identifier.
        /// </summary>
        /// <param name="id">The unique identifier of the library member.</param>
        /// <returns>API response containing the library member details.</returns>
        Task<ApiResponse<LibraryMember>> GetLibraryMemberByID(int id);

        /// <summary>
        /// Retrieves a paginated list of staff library memberships based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of staff library members.</returns>
        Task<ApiResponse<PagedResult<StaffLibraryMember>>> GetAllStaffMembershipWithPageAsync(StaffLibraryMemberSearchModel request);

        /// <summary>
        /// Retrieves a paginated list of issued books based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of issued books.</returns>
        Task<ApiResponse<PagedResult<IssueReturnViewModel>>> GetAllIssuedBooksWithPageIndexAsync(IssueBookSearchModel request);

        /// <summary>
        /// Retrieves a paginated list of library members with page index based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of library members.</returns>
        Task<ApiResponse<PagedResult<LibraryMemberViewModel>>> GetAllLibraryMemberWithPageIndexAsync(MemberSearchModel request);

        #region All Libary Master Table Dropdwonbind
        /// <summary>
        /// Retrieves a dropdown list of library document types for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryDocumentTypeDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library document statuses for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryDocumentStatusDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library categories for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryCategoryDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library languages for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryLanguageDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library suppliers for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibrarySupplierDropdownList(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library series for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibrarySeriesDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library budgets for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryBudgetDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library publishers for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryPublisherDropdownListAsync(int companyId);

        /// <summary>
        /// Retrieves a dropdown list of library subjects, optionally filtered by category.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="categoryId">The category identifier filter.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibrarySubjectDropdownListAsync(int companyId, int categoryId);

        /// <summary>
        /// Retrieves a dropdown list of library authors for a company.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing a list of dropdown options.</returns>
        Task<ApiResponse<List<DropdownModel>>> GetLibraryAuthorDropdownListAsync(int companyId);

        /// <summary>
        /// Searches for book titles matching the specified search term.
        /// </summary>
        /// <param name="term">The search term.</param>
        /// <returns>API response containing a list of matching book views.</returns>
        Task<ApiResponse<List<BookViewModel>>> SearchBookTitleAsync(string term, int companyId);
        #endregion

        /// <summary>
        /// Creates or updates a book front page attachment file.
        /// </summary>
        /// <param name="req">The attachment upsert request model.</param>
        /// <returns>API response containing the operation result.</returns>
        Task<ApiResponse<dynamic>> UpsertBooksFrontPageAttachmentFileAsync(BooksAttachmentUpsertRequest req);

        /// <summary>
        /// Retrieves a paginated list of accession records based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of accession records.</returns>
        Task<ApiResponse<PagedResult<AccessionDetailsModel>>> GetAllAccessionWithPageAsync(LibrarySearchRequest request);

        /// <summary>
        /// Retrieves details of an accession record by its identifier.
        /// </summary>
        /// <param name="id">The accession ID.</param>
        /// <param name="companyId">The company identifier.</param>
        /// <returns>API response containing the accession record details.</returns>
        Task<ApiResponse<AccessionDetailsModel>> GetAccessionById(int id, int companyId);

        /// <summary>
        /// Retrieves details of an accession record by its accession number.
        /// </summary>
        /// <param name="accessionNo">The accession number.</param>
        /// <param name="companyid">The company identifier.</param>
        /// <returns>API response containing the accession record details.</returns>
        Task<ApiResponse<AccessionDetailsModel>> GetAccessionByNo(string accessionNo, int companyid);

        /// <summary>
        /// Creates or updates an accession status.
        /// </summary>
        /// <param name="req">The accession status upsert request.</param>
        /// <returns>API response containing the operation result.</returns>
        Task<ApiResponse<SpResult>> UpsertAccessionStatusAsync(AccessionStatusUpsertRequest req);

        /// <summary>
        /// Retrieves accession records matching label search criteria.
        /// </summary>
        /// <param name="request">The search filter request.</param>
        /// <returns>API response containing matching accession records.</returns>
        Task<ApiResponse<List<AccessionDetailsModel>>> GetAccessionForLabelsAsync(AccessionSearchRequest request);

        /// <summary>
        /// Retrieves or generates the next library issue number.
        /// </summary>
        /// <param name="companyID">The company identifier.</param>
        /// <returns>API response containing the issue number.</returns>
        Task<ApiResponse<IssueNoResponse>> GetIssueNoAsync(int companyID);

        /// <summary>
        /// Saves a book issue transaction request.
        /// </summary>
        /// <param name="request">The book issue save request details.</param>
        /// <returns>API response containing the operation result.</returns>
        Task<ApiResponse<SpResult>> SaveIssueBook(LibraryIssueSaveRequest request);

        /// <summary>
        /// Marks an issued book as returned.
        /// </summary>
        /// <param name="request">The library return request details.</param>
        /// <returns>API response containing the operation result.</returns>
        Task<ApiResponse<object>> ReturnIssueBook(LibraryReturnRequest request);

        /// <summary>
        /// Retrieves detailed information for a specific book including accessions and history.
        /// </summary>
        /// <param name="bookId">The book identifier.</param>
        /// <returns>API response containing the book details result.</returns>
        Task<ApiResponse<BookDetailsResult>> GetBookDetailsAsync(int bookId);

        /// <summary>
        /// Registers student library memberships in bulk along with card numbers.
        /// </summary>
        /// <param name="request">The bulk request details.</param>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="userId">The user identifier performing the operation.</param>
        /// <returns>API response containing the bulk operation result.</returns>
        Task<ApiResponse<object>> AddStudentsMembershipBulkWithCards(
            BulkMembershipRequest request,
            int companyId,
            int userId);

        /// <summary>
        /// Searches library members matching search text.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="memberType">The member type (Student/Staff/All).</param>
        /// <param name="searchText">Optional search text filter.</param>
        /// <returns>API response containing matching library members.</returns>
        Task<ApiResponse<List<LibraryMemberSearchResult>>> SearchMemberAsync(int companyId, string memberType, string? searchText);

        /// <summary>
        /// Searches accession records by accession number.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="searchText">Optional search text filter.</param>
        /// <returns>API response containing matching accession records.</returns>
        Task<ApiResponse<List<AccessionDetailsModel>>> SearchAccessionNoAsync(int companyId, string? searchText);
    }
}
