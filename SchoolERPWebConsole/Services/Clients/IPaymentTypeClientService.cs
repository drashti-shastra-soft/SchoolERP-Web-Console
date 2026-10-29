using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IPaymentTypeClientService
    {
        Task<ApiResponse<UpsertPaymentTypeResponse>> UpsertPaymentTypeAsync(PaymentTypeRequest request);
        Task<ApiResponse<PaymentTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<PaymentTypeModel>>> GetAllPaymentTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> UpsertPaymentTypeAttachmentFileAsync(PaymentTypeAttachmentUpsertRequest req);
        Task<ApiResponse<List<DropdownModel>>> GetPaymenTypeDropdownListAsync();
        Task<ApiResponse<List<PaymentTypeModel>>> GetAllAsync();
    }
}
