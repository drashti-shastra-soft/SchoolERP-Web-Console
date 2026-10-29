using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IStudentInformationReportClientService
    {
        Task<ApiResponse<PagedResult<StudentInformationReportModel>>> GetStudentReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<StudentCountReportResponse>>> GETStudentCountReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<GuardianReportResponse>>> GETStudentGuardianReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<LoginCredentialReportResponse>>> GETLoginCredentialReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<AdmissionReportResponse>>> GETAdmissionReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<StudentGenderRatioReportResponse>>> GetStudentGenderRatioReportReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<TimeTableClassSubjectReportResponse>>> GetClassSubjectReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<StudentTeacherRatioReportResponse>>> GetStudentTeacherRatioReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<StudentHostelReportResponse>>> GetStudentHostelReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<StaffReportResponse>>> GetStaffReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<ItemStockReportResponse>>> GetStockReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<AddItemResponse>>> GetAddItemReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<ItemIssueResponse>>> GetIssueItemReportAsync(StudentReportRequest request);
    }
}
