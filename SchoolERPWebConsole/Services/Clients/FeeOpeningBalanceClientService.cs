using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeOpeningBalanceClientService: BaseApiClient, IFeeOpeningBalanceClientService
    {
        public FeeOpeningBalanceClientService(HttpClient client) : base(client) { }               

        public async Task<ApiResponse<StudentFeeOpeningBalanceResponse>> GetRowsAsync(StudentFeeOpeningBalanceGetRequest request)
        {
            return await PostAsync<StudentFeeOpeningBalanceResponse>("api/FeeOpeningAPI/GetOpeningBalance", request);
        }

        public async Task<ApiResponse<StudentFeeOpeningBalanceSaveResponse>> SaveAsync(StudentFeeOpeningBalanceSaveRequest request)
        {
            return await PostAsync<StudentFeeOpeningBalanceSaveResponse>("api/FeeOpeningAPI/Save", request);
        }

        public async Task<ApiResponse<List<FeeInstallmentDropdownResponse>>> GetInstallmentDropdownAsync(int companyId, int sessionId)
        {
            return await GetAsync<List<FeeInstallmentDropdownResponse>>($"api/FeeOpeningAPI/GetInstallmentDropdown?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<List<PositionOfStudentFeeResponse>>> GetPositionOfStudentFeeAsync(PositionOfStudentFeeRequest request)
        {
            return await PostAsync<List<PositionOfStudentFeeResponse>>("api/FeeOpeningAPI/GetPositionOfStudentFee", request);
        }
    }
}
