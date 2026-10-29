using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IItemSupplierClientService
    {
        Task<ApiResponse<SpResult>> UpsertItemSupplierAsync(ItemSupplierRequest request);
        Task<ApiResponse<ItemSupplierModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<ItemSupplierModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<ItemSupplierModel>>> GetAllItemSupplierWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyItemSupplierAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetItemSupplierDropdownListAsync(int companyId, int sessionId);
    }
}
