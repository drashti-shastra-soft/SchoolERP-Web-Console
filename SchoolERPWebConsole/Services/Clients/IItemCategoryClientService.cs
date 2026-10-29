using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IItemCategoryClientService
    {
        Task<ApiResponse<SpResult>> UpsertItemCategoryAsync(ItemCategoryModelRequest request);
        Task<ApiResponse<ItemCategoryModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<ItemCategoryModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<ItemCategoryModel>>> GetAllItemCategoryWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyItemCategoryAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetItemCategorDropdownListAsync(int companyId, int sessionId);
        Task<ApiResponse<List<DropdownItemCategoryModel>>> GetItemByItemCategoryDropdownListAsync(int companyId, int sessionId, int itemCategoryId);
    }
}
