using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class StudentInformationReportClientService : BaseApiClient, IStudentInformationReportClientService
    {
        public StudentInformationReportClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<PagedResult<StudentInformationReportModel>>> GetStudentReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StudentInformationReportModel>>("api/StudentInformationReportAPI/GetStudentReport", request);
        }
        public async Task<ApiResponse<PagedResult<StudentCountReportResponse>>> GETStudentCountReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StudentCountReportResponse>>("api/StudentInformationReportAPI/GETStudentCountReport", request);
        }
        public async Task<ApiResponse<PagedResult<GuardianReportResponse>>> GETStudentGuardianReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<GuardianReportResponse>>("api/StudentInformationReportAPI/GETStudentGuardianReport", request);
        }
        public async Task<ApiResponse<PagedResult<LoginCredentialReportResponse>>> GETLoginCredentialReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<LoginCredentialReportResponse>>("api/StudentInformationReportAPI/GETLoginCredentialReport", request);
        }
        public async Task<ApiResponse<PagedResult<AdmissionReportResponse>>> GETAdmissionReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<AdmissionReportResponse>>("api/StudentInformationReportAPI/GETAdmissionReport", request);
        }

        public async Task<ApiResponse<PagedResult<StudentGenderRatioReportResponse>>> GetStudentGenderRatioReportReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StudentGenderRatioReportResponse>>("api/StudentInformationReportAPI/GetStudentGenderRatioReportReport", request);
        }

        public async Task<ApiResponse<PagedResult<TimeTableClassSubjectReportResponse>>> GetClassSubjectReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<TimeTableClassSubjectReportResponse>>("api/StudentInformationReportAPI/GetClassSubjectReport", request);
        }

        public async Task<ApiResponse<PagedResult<StudentTeacherRatioReportResponse>>> GetStudentTeacherRatioReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StudentTeacherRatioReportResponse>>("api/StudentInformationReportAPI/GetStudentTeacherRatioReport", request);
        }

        public async Task<ApiResponse<PagedResult<StudentHostelReportResponse>>> GetStudentHostelReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StudentHostelReportResponse>>("api/StudentInformationReportAPI/GetStudentHostelReport", request);
        }

        public async Task<ApiResponse<PagedResult<StaffReportResponse>>> GetStaffReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StaffReportResponse>>("api/StudentInformationReportAPI/GetStaffReport", request);
        }

        public async Task<ApiResponse<PagedResult<ItemStockReportResponse>>> GetStockReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<ItemStockReportResponse>>("api/StudentInformationReportAPI/GetStockReport", request);
        }

        public async Task<ApiResponse<PagedResult<AddItemResponse>>> GetAddItemReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<AddItemResponse>>("api/StudentInformationReportAPI/GetAddItemReport", request);
        }

        public async Task<ApiResponse<PagedResult<ItemIssueResponse>>> GetIssueItemReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<ItemIssueResponse>>("api/StudentInformationReportAPI/GetIssueItemReport", request);
        }
    }
}
