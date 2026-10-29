using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    // ---- FeeCollectionClientService.cs ----
    public class FeeCollectionClientService : BaseApiClient, IFeeCollectionClientService
    {
        public FeeCollectionClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<StudentFeeTemplateListResponse>> GetStudentFeeListAsync(StudentFeeListRequest request)
        {
            return await PostAsync<StudentFeeTemplateListResponse>("api/FeeCollectionAPI/GetStudentFeeList", request);
        }

        public async Task<ApiResponse<FeeCollectResponse>> CollectOfflineAsync(FeeCollectRequest request)
        {
            return await PostAsync<FeeCollectResponse>("api/FeeCollectionAPI/CollectOffline", request);
        }

        public async Task<ApiResponse<OnlineStartResponse>> StartOnlineAsync(OnlineStartRequest request)
        {
            return await PostAsync<OnlineStartResponse>("api/FeeCollectionAPI/StartOnline", request);
        }

        public async Task<ApiResponse<FeeCollectResponse>> FinalizeOnlineAsync(OnlineFinalizeRequest request)
        {
            return await PostAsync<FeeCollectResponse>("api/FeeCollectionAPI/FinalizeOnline", request);
        }

        public async Task<ApiResponse<FeeCollectResponse>> CancelOnlineAsync(OnlineCancelRequest request)
        {
            return await PostAsync<FeeCollectResponse>("api/FeeCollectionAPI/CancelOnline", request);
        }

        public async Task<ApiResponse<RefundResponse>> RefundAsync(RefundRequest request)
        {
            return await PostAsync<RefundResponse>("api/FeeCollectionAPI/Refund", request);
        }
        public async Task<ApiResponse<PagedResult<StudentFeeGetAllResponse>>> GetAllStudentFeeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<StudentFeeGetAllResponse>>($"api/FeeCollectionAPI/GetAllStudentFeeWithPage", request);
        }

    }
}
