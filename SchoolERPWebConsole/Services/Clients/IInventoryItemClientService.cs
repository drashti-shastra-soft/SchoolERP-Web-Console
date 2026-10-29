using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IInventoryItemClientService
    {
        Task<ApiResponse<SpResult>> UpsertInventoryItemAsync(InventoryItemModelRequest request);
        Task<ApiResponse<InventoryItemModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<InventoryItemModel>>> GetAllInventoryItemWithPageAsync(SearchInventoryItemRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
