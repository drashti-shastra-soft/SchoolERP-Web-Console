using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeDiscountClientService : BaseApiClient, IFeeDiscountClientService
    {
        public FeeDiscountClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<List<DropdownModel>>> GetConcessionsAsync(int companyId)
        {
            return await GetAsync<List<DropdownModel>>($"api/FeeDiscount/ConcessionDropdown?companyId={companyId}");
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetDiscountByUsersAsync(int companyId)
        {
            return await GetAsync<List<DropdownModel>>($"api/FeeDiscount/DiscountByDropdown?companyId={companyId}");
        }

        public async Task<ApiResponse<List<StudentFeeDiscountRowResponse>>> GetRowsAsync(int studentId, int companyId, int sessionId)
        {
            return await GetAsync<List<StudentFeeDiscountRowResponse>>($"api/FeeDiscount/GetRows?studentId={studentId}&companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<StudentFeeDiscountSaveResponse>> SaveAsync(StudentFeeDiscountSaveRequest request)
        {
            return await PostAsync<StudentFeeDiscountSaveResponse>("api/FeeDiscount/Save", request);
        }

        public async Task<ApiResponse<StudentFeeDiscountHeaderResponse>> GetHeaderAsync(StudentFeeDiscountHeaderRequest request)
        {
            return await PostAsync<StudentFeeDiscountHeaderResponse>("api/FeeDiscount/GetHeader", request);
        }
    }
}
