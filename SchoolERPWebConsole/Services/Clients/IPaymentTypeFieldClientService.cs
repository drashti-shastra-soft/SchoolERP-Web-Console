using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IPaymentTypeFieldClientService
    {
        Task<ApiResponse<SpResult>> UpsertPaymentTypeAsync(PaymentFieldRequest request);
        Task<ApiResponse<PaymentTypeFieldModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<PaymentTypeFieldModel>>> GetAllPaymentTypeFieldWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
