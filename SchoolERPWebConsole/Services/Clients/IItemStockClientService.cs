using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IItemStockClientService
    {
        Task<ApiResponse<UpsertItemStockResponse>> UpsertItemStockAsync(ItemStockModelRequest request);
        Task<ApiResponse<ItemStockModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<ItemStockModel>>> GetAllItemStockWithPageAsync(SearchItemStockRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> UpsertPostalDispatchAttachmentFileAsync(ItemStockAttachmentUpsertRequest req);
    }
}
