using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IStudentInformationClientService
    {
        Task<ApiResponse<PagedResult<StudentListViewModel>>> GetStudentListAsync(int? companyId, int? sessionId, int? classId = null, int? sectionId = null, string? searchTerm = null, int? PageNumber = null, int? PageSize = null, int? studentId = null);
        Task<ApiResponse<StudentDetailsViewModel>> GetStudentByIDAsync(int id, int companyId, int sessionId);
        Task<ApiResponse<List<StudentDisableReasonViewModel>>> GetAllDisableReasons(int sessionID, int companyId, bool? IncludeIsActive = null);
        Task<ApiResponse<List<StudentHouseViewModel>>> GetAllStudentHouses(int sessionID, int companyId, bool? IncludeIsActive = null);
        Task<ApiResponse<List<StudentCategoryViewModel>>> GetAllStudentCategories(int sessionId, int companyId, bool? includeDeleted = null);
        Task<ApiResponse<string>> GetNewStudentRollNo(StudentRollNoRequest request);
        Task<ApiResponse<string>> GetNextAdmissionNo();
        Task<ApiResponse<int>> UpsertStudentAdmission(StudentAdmissionUpsertRequest request);
        Task<ApiResponse<object>> BulkDeleteStudents(List<int> studentIds);
        Task<ApiResponse<List<StudentListViewModel>>> GetDisabledStudentList(
            int? classId = null,
            int? sectionId = null,
            string? searchTerm = null, int? sessionId = null, int? companyId = null);
        Task<ApiResponse<object>> UpsertDisableReason(
            StudentDisableReasonUpsertRequest request);
        Task<ApiResponse<object>> DeleteDisableReason([FromBody] List<int> ids);
        Task<ApiResponse<object>> UpsertStudentHouse(
            StudentHouseUpsertRequest request);
        Task<ApiResponse<object>> DeleteStudentHouse(List<int> ids);
        Task<ApiResponse<object>> UpsertStudentCategory(
            StudentCategoryUpsertRequest request);
        Task<ApiResponse<object>> DeleteStudentCategory(List<int> ids);
        Task<ApiResponse<List<StudentTimelineViewModel>>> GetStudentTimeline(int studentId);
        Task<ApiResponse<UpsertStudentTimelineResponse>> UpsertTimeline(
            StudentTimelineUpsertRequest request);
        Task<ApiResponse<object>> DeleteTimeline(int id);
        Task<ApiResponse<StudentTimelineDocumentModel>> DownloadTimelineDoc(int id);
        Task<ApiResponse<object>> ToggleStatus(
            StudentStatusToggleRequest request);
        Task<ApiResponse<List<StudentListViewModel>>> GetMultiClassStudents(
            int? classId,
            int? sectionId,
            int? companyId,
            int? sessionId,
            string? searchTerm);
        Task<ApiResponse<object>> UpsertMultiClass(
            StudentMultiClassUpsertRequest request);
        Task<ApiResponse<object>> DeleteMultiClass(int id);
        Task<ApiResponse<StudentCategoryViewModel>> GetStudentCategoryByIdAsync(int id, int companyId, int sessionId);
        Task<ApiResponse<StudentHouseViewModel>> GetStudentHouseByIdAsync(int id);
        Task<ApiResponse<StudentDisableReasonViewModel>> GetDisableReasonsByID(int id);

        Task<ApiResponse<SpResult>> UpdateStudentProfileAsync(ProfileRequest req);

        Task<ApiResponse<PagedResult<StudentHouseViewModel>>> GetStudentHouseListAsync(SubjectSearchRequest request);
        Task<ApiResponse<List<StudentDropDwonBindViewModel>>> GetStudentBindAsync(StudentDropDwonBindRequestModel request);

        Task<ApiResponse<List<StudentAddressDetailsModel>>> GetStudentAddressListAsync(int companyId, int sessionID, int? studentId);

        Task<ApiResponse<int>> SaveStudentDocumentsBulkAsync(List<StudentDocumentSaveModel> documents);
        Task<ApiResponse<List<StudentDocumentModel>>> GetStudentDocumentsAsync(int studentId);
        Task<ApiResponse<List<StudentUserModel>>> GetStudentLoginDetailsBindAsync(int userId);
        Task<ApiResponse<object>> BulkUpsertMultiClassAsync(MultiClassBulkSaveRequest documents);
        Task<ApiResponse<StudentDisableViewModel>> GetStudentDisableAsync(int studentId, int companyId, int sessionId);
        Task<ApiResponse<object>> UpsertStudentDisableAsync(
            StudentDisableReq request);

        Task<ApiResponse<PagedResult<StudentCategoryViewModel>>> GetAllStudentCategoriesWithPageAsync(StudentCategorySearch request);
        Task<ApiResponse<dynamic>> ToggleStudentCategoryStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<SpResult>> CopyStudentCategoryAsync(CopyRequest request);
        Task<ApiResponse<dynamic>> ToggleStudentHouseStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<SpResult>> CopyStudentHouseAsync(CopyRequest request);
        Task<ApiResponse<dynamic>> ToggleDisableReasonStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<SpResult>> CopyDisableReasonAsync(CopyRequest request);
        Task<ApiResponse<PagedResult<StudentDisableReasonViewModel>>> GetAllDisableReasonsWithPageAsync(StudentCategorySearch request);
        Task<ApiResponse<StudentTimelineViewModel>> GetTimelineByIdAsync(int id);
        Task<ApiResponse<dynamic>> UpsertStudentTimelineAttachmentFileAsync(StudentTimelineAttachmentUpsertRequest req);

        Task<ApiResponse<dynamic>> StudentChangePasswordAsync(StatusChangePassRequest request);
        Task<ApiResponse<List<StudentListViewModel>>> GetStudentAllListAsync(int? companyId, int? sessionId, int? classId = null, int? sectionId = null);

        Task<ApiResponse<StudentFeeTemplateListResponse>> GetStudentFeeTemplateListAsync(int studentId, int companyId, int sessionId);
        Task<ApiResponse<List<FeesSearchStudentResponse>>> GetAllFeesSearchStudent(int companyId, string? studentSearch = null);
        Task<ApiResponse<List<FeesSearchVoucherResponse>>> GetAllSearchVoucher(int companyId, string? studentSearch = null, int? voucherId = null);
        Task<ApiResponse<List<int>>> GetFilteredStudentIdsAsync(int companyId, string? search, int? classId, int? sectionId);
        Task<ApiResponse<BulkMailResult>> SendBulkMailAsync(BulkMailSendRequest request);
        Task<ApiResponse<BulkMailBatchStatus>> BatchStatusAsync(Guid batchId);
    }
}
