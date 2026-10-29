using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface  IFeeCollectionClientService
    {
        Task<ApiResponse<StudentFeeTemplateListResponse>> GetStudentFeeListAsync(StudentFeeListRequest request);
        Task<ApiResponse<FeeCollectResponse>> CollectOfflineAsync(FeeCollectRequest request);
        Task<ApiResponse<OnlineStartResponse>> StartOnlineAsync(OnlineStartRequest request);
        Task<ApiResponse<FeeCollectResponse>> FinalizeOnlineAsync(OnlineFinalizeRequest request);
        Task<ApiResponse<FeeCollectResponse>> CancelOnlineAsync(OnlineCancelRequest request);
        Task<ApiResponse<RefundResponse>> RefundAsync(RefundRequest request);
        Task<ApiResponse<PagedResult<StudentFeeGetAllResponse>>> GetAllStudentFeeWithPageAsync(SearchRequest request);
    }
}
