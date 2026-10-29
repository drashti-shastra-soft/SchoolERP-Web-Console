using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class StudentInformationClientService : BaseApiClient, IStudentInformationClientService
    {
        public StudentInformationClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<PagedResult<StudentListViewModel>>> GetStudentListAsync(int? companyId,int? sessionId,int? classId = null, int? sectionId = null, string? searchTerm = null, int? PageNumber=null, int? PageSize=null, int? studentId=null)
        {
            var url = $"api/StudentInformationApi/GetStudentList?companyId={companyId}&sessionId={sessionId}&classId={classId}&sectionId={sectionId}&searchTerm={searchTerm}&PageNumber={PageNumber}&PageSize={PageSize}&studentId={studentId}";
            return GetAsync<PagedResult<StudentListViewModel>>(url);
        }

        public Task<ApiResponse<StudentDetailsViewModel>> GetStudentByIDAsync(int id, int companyId, int sessionId)
        {
            return GetAsync<StudentDetailsViewModel>($"api/StudentInformationApi/GetByID?id={id}&companyId={companyId}&sessionId={sessionId}");
        }

        public Task<ApiResponse<List<StudentDisableReasonViewModel>>> GetAllDisableReasons(int sessionID, int companyId, bool? IncludeIsActive = null)
        {
            return GetAsync<List<StudentDisableReasonViewModel>>($"api/StudentInformationApi/GetAllDisableReasons?sessionID={sessionID}&companyId={companyId}&IncludeIsActive={IncludeIsActive}");
        }

        public Task<ApiResponse<List<StudentHouseViewModel>>> GetAllStudentHouses(int sessionID, int companyId, bool? IncludeIsActive = null)
        {
            return GetAsync<List<StudentHouseViewModel>>($"api/StudentInformationApi/GetAllStudentHouses?sessionID={sessionID}&companyId={companyId}&IncludeIsActive={IncludeIsActive}");
        }

        public Task<ApiResponse<List<StudentCategoryViewModel>>> GetAllStudentCategories(int sessionId, int companyId, bool? includeDeleted = null)
        {
            return GetAsync<List<StudentCategoryViewModel>>($"api/StudentInformationApi/GetAllStudentCategories?sessionId={sessionId}&companyId={companyId}&includeDeleted={includeDeleted}");
        }

        /// <summary>
        /// Generates the next student roll number.
        /// </summary>
        public Task<ApiResponse<string>> GetNewStudentRollNo(StudentRollNoRequest request)
        {
            return PostAsync<string>(
                "api/StudentInformationApi/GetNewStudentRollNo",
                request);
        }

        /// <summary>
        /// Retrieves the next available admission number.
        /// </summary>
        /// <returns>Admission number response.</returns>
        public Task<ApiResponse<string>> GetNextAdmissionNo()
        {
            return GetAsync<string>(
                "api/StudentInformationApi/GetNextAdmissionNo");
        }

        /// <summary>
        /// Creates or updates a student admission.
        /// </summary>
        public Task<ApiResponse<int>> UpsertStudentAdmission(
            StudentAdmissionUpsertRequest request)
        {
            return PostAsync<int>(
                "api/StudentInformationApi/UpsertStudentAdmission",
                request);
        }

        /// <summary>
        /// Deletes multiple students.
        /// </summary>
        /// <param name="studentIds">List of Student IDs.</param>
        /// <returns>Operation status and message.</returns>
        public Task<ApiResponse<object>> BulkDeleteStudents(List<int> studentIds)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/BulkDeleteStudents",
                studentIds);
        }

        /// <summary>
        /// Retrieves the list of disabled students.
        /// </summary>
        public Task<ApiResponse<List<StudentListViewModel>>> GetDisabledStudentList(
            int? classId = null,
            int? sectionId = null,
            string? searchTerm = null, int? sessionId=null, int? companyId = null)
        {
            return GetAsync<List<StudentListViewModel>>(
                $"api/StudentInformationApi/GetDisabledStudentList" +
                $"?classId={classId}" +
                $"&sectionId={sectionId}" +
                $"&searchTerm={Uri.EscapeDataString(searchTerm ?? string.Empty)}" +
                $"&sessionId={sessionId}&companyId={companyId}");
        }

        /// <summary>
        /// Creates or updates a student disable reason.
        /// </summary>
        /// <param name="request">Disable reason information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> UpsertDisableReason(
            StudentDisableReasonUpsertRequest request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/UpsertDisableReason",
                request);
        }

        /// <summary>
        /// Deletes a student disable reason.
        /// </summary>
        /// <param name="id">Disable Reason ID.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> DeleteDisableReason([FromBody] List<int> ids)
        {
            return PostAsync<object>(
                $"api/StudentInformationApi/DeleteDisableReason", ids);
        }

        /// <summary>
        /// Creates or updates a student house.
        /// </summary>
        /// <param name="request">Student house information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> UpsertStudentHouse(
            StudentHouseUpsertRequest request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/UpsertStudentHouse",
                request);
        }

        /// <summary>
        /// Deletes a student house.
        /// </summary>
        /// <param name="id">Student House ID.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> DeleteStudentHouse(List<int> ids)
        {
            return PostAsync<object>(
                $"api/StudentInformationApi/DeleteStudentHouse", ids);
        }

        /// <summary>
        /// Creates or updates a student category.
        /// </summary>
        /// <param name="request">Student category information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> UpsertStudentCategory(
            StudentCategoryUpsertRequest request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/UpsertStudentCategory",
                request);
        }

        /// <summary>
        /// Deletes a student category.
        /// </summary>
        /// <param name="id">Student Category ID.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> DeleteStudentCategory(List<int> ids)
        {
            return PostAsync<object>(
                $"api/StudentInformationApi/DeleteStudentCategory", ids);                
        }

        /// <summary>
        /// Retrieves timeline history for a student.
        /// </summary>
        /// <param name="studentId">Student ID.</param>
        /// <returns>Student timeline data.</returns>
        public Task<ApiResponse<List<StudentTimelineViewModel>>> GetStudentTimeline(int studentId)
        {
            return GetAsync<List<StudentTimelineViewModel>>(
                $"api/StudentInformationApi/GetStudentTimeline/{studentId}");
        }

        /// <summary>
        /// Creates or updates a student timeline entry.
        /// </summary>
        /// <param name="request">Timeline information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<UpsertStudentTimelineResponse>> UpsertTimeline(
            StudentTimelineUpsertRequest request)
        {
            return PostAsync<UpsertStudentTimelineResponse>(
                "api/StudentInformationApi/UpsertTimeline",
                request);
        }

        /// <summary>
        /// Deletes a student timeline entry.
        /// </summary>
        /// <param name="id">Timeline ID.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> DeleteTimeline(int id)
        {
            return PostAsync<object>(
                $"api/StudentInformationApi/DeleteTimeline/{id}",
                new { });
        }

        /// <summary>
        /// Downloads a student timeline document.
        /// </summary>
        /// <param name="id">Timeline ID.</param>
        /// <returns>Document bytes.</returns>
        public Task<ApiResponse<StudentTimelineDocumentModel>> DownloadTimelineDoc(int id)
        {
            return GetAsync<StudentTimelineDocumentModel>(
                $"api/StudentInformationApi/DownloadTimelineDoc/{id}");
        }

        /// <summary>
        /// Changes the status of a student.
        /// </summary>
        /// <param name="request">Student status information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> ToggleStatus(
            StudentStatusToggleRequest request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/ToggleStatus",
                request);
        }

        /// <summary>
        /// Retrieves students available for multi-class assignment.
        /// </summary>
        /// <param name="classId">Class ID.</param>
        /// <param name="sectionId">Section ID.</param>
        /// <param name="searchTerm">Search term.</param>
        /// <returns>List of students.</returns>
        public Task<ApiResponse<List<StudentListViewModel>>> GetMultiClassStudents(
            int? classId,
            int? sectionId,
            int? companyId,
            int? sessionId,
            string? searchTerm)
        {
            return GetAsync<List<StudentListViewModel>>(
                $"api/StudentInformationApi/GetMultiClassStudents" +
                $"?classId={classId}" +
                $"&sectionId={sectionId}" +
                $"&companyId={companyId}" +
                $"&sessionId={sessionId}" +
                $"&searchTerm={Uri.EscapeDataString(searchTerm ?? string.Empty)}");
        }

        /// <summary>
        /// Creates or updates a student's multi-class assignment.
        /// </summary>
        /// <param name="request">Multi-class assignment information.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> UpsertMultiClass(
            StudentMultiClassUpsertRequest request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/UpsertMultiClass",
                request);
        }
        /// <summary>
        /// Deletes a student multi-class assignment.
        /// </summary>
        /// <param name="id">Multi-Class ID.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<object>> DeleteMultiClass(int id)
        {
            return PostAsync<object>(
                $"api/StudentInformationApi/DeleteMultiClass/{id}",
                new { });
        }

        public Task<ApiResponse<StudentCategoryViewModel>> GetStudentCategoryByIdAsync(int id, int companyId, int sessionId)
        {
            return GetAsync<StudentCategoryViewModel>($"api/StudentInformationApi/GetStudentCategoryById?id={id}&companyId={companyId}&sessionId={sessionId}");
        }

        public Task<ApiResponse<StudentHouseViewModel>> GetStudentHouseByIdAsync(int id)
        {
            return GetAsync<StudentHouseViewModel>($"api/StudentInformationApi/GetStudentHouseById/{id}");
        }

        public Task<ApiResponse<StudentDisableReasonViewModel>> GetDisableReasonsByID(int id)
        {
            return GetAsync<StudentDisableReasonViewModel>($"api/StudentInformationApi/GetDisableReasonsByID/{id}");
        }

        public Task<ApiResponse<SpResult>> UpdateStudentProfileAsync(ProfileRequest req)
           => PostAsync<SpResult>("api/StudentInformationApi/UpdateStudentProfile", req);


        
        public async Task<ApiResponse<PagedResult<StudentHouseViewModel>>> GetStudentHouseListAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<StudentHouseViewModel>>("api/StudentInformationApi/GetStudentHouseList", request);
        }

        public Task<ApiResponse<List<StudentDropDwonBindViewModel>>> GetStudentBindAsync(StudentDropDwonBindRequestModel request)
        {
            return PostAsync<List<StudentDropDwonBindViewModel>>(
                "api/StudentInformationApi/GetStudentBind",
                request);
        }

        public Task<ApiResponse<List<StudentAddressDetailsModel>>> GetStudentAddressListAsync( int companyId,int sessionID, int? studentId)
        {
            return GetAsync<List<StudentAddressDetailsModel>>($"api/StudentInformationApi/GetStudentAddressList?companyId={companyId}&sessionID={sessionID}&studentId={studentId}");
        }

        public Task<ApiResponse<int>> SaveStudentDocumentsBulkAsync(List<StudentDocumentSaveModel> documents)
        {
            return PostAsync<int>(
                "api/StudentInformationApi/SaveStudentDocumentsBulk",
                documents);
        }

        public Task<ApiResponse<List<StudentDocumentModel>>> GetStudentDocumentsAsync(int studentId)
        {
            return GetAsync<List<StudentDocumentModel>>($"api/StudentInformationApi/GetStudentDocuments?studentId={studentId}");
        }

        public Task<ApiResponse<List<StudentUserModel>>> GetStudentLoginDetailsBindAsync(int userId)
        {
            return GetAsync<List<StudentUserModel>>($"api/StudentInformationApi/GetStudentLoginDetailsBind?userId={userId}");
        }

        public Task<ApiResponse<object>> BulkUpsertMultiClassAsync(MultiClassBulkSaveRequest documents)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/BulkUpsertMultiClass",
                documents);
        }

        public Task<ApiResponse<StudentDisableViewModel>> GetStudentDisableAsync(int studentId, int companyId, int sessionId)
        {
            return GetAsync<StudentDisableViewModel>($"api/StudentInformationApi/GetStudentDisable?studentId={studentId}&companyId={companyId}&sessionId={sessionId}");
        }

        public Task<ApiResponse<object>> UpsertStudentDisableAsync(
            StudentDisableReq request)
        {
            return PostAsync<object>(
                "api/StudentInformationApi/UpsertStudentDisable",
                request);
        }

        public async Task<ApiResponse<PagedResult<StudentCategoryViewModel>>> GetAllStudentCategoriesWithPageAsync(StudentCategorySearch request)
        {
            return await PostAsync<PagedResult<StudentCategoryViewModel>>("api/StudentInformationApi/GetAllStudentCategoriesWithPage", request);
        }

        public Task<ApiResponse<dynamic>> ToggleStudentCategoryStatusAsync(StatusUpdateRequest request)
           => PostAsync<dynamic>($"api/StudentInformationApi/ToggleStudentCategoryStatus", request);

        public Task<ApiResponse<SpResult>> CopyStudentCategoryAsync(CopyRequest request)
           => PostAsync<SpResult>($"api/StudentInformationApi/CopyStudentCategory", request);

        public Task<ApiResponse<dynamic>> ToggleStudentHouseStatusAsync(StatusUpdateRequest request)
           => PostAsync<dynamic>($"api/StudentInformationApi/ToggleStudentHouseStatus", request);

        public Task<ApiResponse<SpResult>> CopyStudentHouseAsync(CopyRequest request)
           => PostAsync<SpResult>($"api/StudentInformationApi/CopyStudentHouse", request);

        public Task<ApiResponse<dynamic>> ToggleDisableReasonStatusAsync(StatusUpdateRequest request)
           => PostAsync<dynamic>($"api/StudentInformationApi/ToggleDisableReasonStatus", request);

        public Task<ApiResponse<SpResult>> CopyDisableReasonAsync(CopyRequest request)
           => PostAsync<SpResult>($"api/StudentInformationApi/CopyDisableReason", request);

        public async Task<ApiResponse<PagedResult<StudentDisableReasonViewModel>>> GetAllDisableReasonsWithPageAsync(StudentCategorySearch request)
        {
            return await PostAsync<PagedResult<StudentDisableReasonViewModel>>("api/StudentInformationApi/GetAllDisableReasonsWithPage", request);
        }

        public Task<ApiResponse<StudentTimelineViewModel>> GetTimelineByIdAsync(int id)
        {
            return GetAsync<StudentTimelineViewModel>($"api/StudentInformationApi/GetTimelineById/{id}");
        }

        public Task<ApiResponse<dynamic>> UpsertStudentTimelineAttachmentFileAsync(StudentTimelineAttachmentUpsertRequest req)
            => PostAsync<dynamic>("api/StudentInformationApi/UpsertStudentTimelineAttachmentFile", req);

        public Task<ApiResponse<dynamic>> StudentChangePasswordAsync(StatusChangePassRequest request)
           => PostAsync<dynamic>($"api/StudentInformationApi/StudentChangePassword", request);

        public Task<ApiResponse<List<StudentListViewModel>>> GetStudentAllListAsync(int? companyId, int? sessionId, int? classId = null, int? sectionId = null)
        {
            var url = $"api/StudentInformationApi/GetStudentAllList?companyId={companyId}&sessionId={sessionId}&classId={classId}&sectionId={sectionId}";
            return GetAsync<List<StudentListViewModel>>(url);
        }

        public Task<ApiResponse<StudentFeeTemplateListResponse>> GetStudentFeeTemplateListAsync(int studentId, int companyId, int sessionId)
        {
            return GetAsync<StudentFeeTemplateListResponse>($"api/StudentInformationApi/GetStudentFeeTemplateList?studentId={studentId}&companyId={companyId}&sessionId={sessionId}");
        }

        public Task<ApiResponse<List<FeesSearchStudentResponse>>> GetAllFeesSearchStudent(int companyId, string? studentSearch = null)
        {
            return GetAsync<List<FeesSearchStudentResponse>>($"api/StudentInformationApi/GetAllFeesSearchStudent?companyId={companyId}&studentSearch={studentSearch}");
        }

        public Task<ApiResponse<List<FeesSearchVoucherResponse>>> GetAllSearchVoucher(int companyId, string? studentSearch = null, int? voucherId=null)
        {
            return GetAsync<List<FeesSearchVoucherResponse>>($"api/StudentInformationApi/GetAllSearchVoucher?companyId={companyId}&studentSearch={studentSearch}&voucherId={voucherId}");
        }

        public async Task<ApiResponse<List<int>>> GetFilteredStudentIdsAsync(int companyId, string? search, int? classId, int? sectionId)
        {
            return await GetAsync<List<int>>($"api/StudentInformationApi/GetFilteredStudentIds?companyId={companyId}&search={search}&classId={classId}&sectionId={sectionId}");
        }

        public Task<ApiResponse<BulkMailResult>> SendBulkMailAsync(BulkMailSendRequest request)
          => PostAsync<BulkMailResult>($"api/StudentInformationApi/SendBulkMail", request);

        public async Task<ApiResponse<BulkMailBatchStatus>> BatchStatusAsync(Guid batchId)
        {
            return await GetAsync<BulkMailBatchStatus>($"api/StudentInformationApi/BatchStatus?batchId={batchId}");
        }
    }
}
