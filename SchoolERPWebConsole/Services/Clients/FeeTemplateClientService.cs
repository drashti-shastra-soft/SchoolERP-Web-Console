using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeTemplateClientService : BaseApiClient, IFeeTemplateClientService
    {
        public FeeTemplateClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<FeeTemplateResponse>> UpsertFeeTemplateAsync(FeeTemplateSaveRequest request)
        {
            return await PostAsync<FeeTemplateResponse>("api/FeeTemplateAPI/Save", request);
        }

        public async Task<ApiResponse<FeeTemplateGetByIdResponse>> GetByIDAsync(int feeTemplateId,int  companyId,int sessionId)
        {
            return await GetAsync<FeeTemplateGetByIdResponse>($"api/FeeTemplateAPI/GetById?feeTemplateId={feeTemplateId}&companyId={companyId}&sessionId={sessionId}");
        }
        public async Task<ApiResponse<FeeTemplatePageApiResponse>> GetPageIndexAsync(FeeTemplateSearchRequest request)
        {
            return await PostAsync<FeeTemplatePageApiResponse>("api/FeeTemplateAPI/GetPageIndex", request);
        }


        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/FeeTemplateAPI/Delete", ids);
        }

        public async Task<ApiResponse<List<FeeTemplateGetByClassSectionResponse>>> GetFeeTemplateByClassSectionAsync(FeeTemplateGetByClassSectionRequest request)
        {
            return await PostAsync<List<FeeTemplateGetByClassSectionResponse>>("api/FeeTemplateAPI/GetFeeTemplateByClassSection", request);
        }

        public async Task<ApiResponse<StudentFeeTemplateDetailsResponse>> GetFeeTemplateDetailsAsync(int feeTemplateId)
        {
            return await GetAsync<StudentFeeTemplateDetailsResponse>($"api/FeeTemplateAPI/GetFeeTemplateDetails/{feeTemplateId}");
        }

        public async Task<ApiResponse<List<StudentInstallmentSummary>>> GetStudentInstallmentSummaryAsync(int studentId, int companyId, int sessionId)
        {
            return await GetAsync<List<StudentInstallmentSummary>>($"api/FeeTemplateAPI/GetStudentInstallmentSummary?studentId={studentId}&companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<List<PaymentModeSummary>>> GetPaymentModeSummaryAsync(StudentFeeCollectionRequest request)
        {
            return await PostAsync<List<PaymentModeSummary>>("api/FeeTemplateAPI/GetPaymentModeSummary", request);
        }
    }
}
