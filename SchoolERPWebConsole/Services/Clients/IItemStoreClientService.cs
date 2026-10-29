using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IItemStoreClientService
    {
        Task<ApiResponse<SpResult>> UpsertItemStoreAsync(ItemStoreModelRequest request);
        Task<ApiResponse<ItemStoreModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<ItemStoreModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<ItemStoreModel>>> GetAllItemStoreWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyItemStoreAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetItemByItemStoreDropdownListAsync(int companyId, int sessionId);
    }
}
