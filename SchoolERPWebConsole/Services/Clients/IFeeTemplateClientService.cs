using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeTemplateClientService
    {
        Task<ApiResponse<FeeTemplateResponse>> UpsertFeeTemplateAsync(FeeTemplateSaveRequest request);
        Task<ApiResponse<FeeTemplateGetByIdResponse>> GetByIDAsync(int feeTemplateId, int companyId, int sessionId);
        Task<ApiResponse<FeeTemplatePageApiResponse>> GetPageIndexAsync(FeeTemplateSearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<List<FeeTemplateGetByClassSectionResponse>>> GetFeeTemplateByClassSectionAsync(FeeTemplateGetByClassSectionRequest request);
        Task<ApiResponse<StudentFeeTemplateDetailsResponse>> GetFeeTemplateDetailsAsync(int feeTemplateId);
        Task<ApiResponse<List<StudentInstallmentSummary>>> GetStudentInstallmentSummaryAsync(int studentId, int companyId, int sessionId);
        Task<ApiResponse<List<PaymentModeSummary>>> GetPaymentModeSummaryAsync(StudentFeeCollectionRequest request);
    }
}
