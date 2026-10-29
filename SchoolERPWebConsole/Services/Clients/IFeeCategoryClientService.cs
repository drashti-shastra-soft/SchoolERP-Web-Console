using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeCategoryClientService
    {
        Task<ApiResponse<SpResult>> UpsertFeeCategoryAsync(FeeCategoryRequest request);
        Task<ApiResponse<FeeCategoryViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<FeeCategoryViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<FeeCategoryViewModel>>> GetAllFeeCategoryWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyFeeCategoryAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetFeeCategoryDropdownListAsync(int? companyId = null, int? sessionID = null, int? categoryGroupId = null);
    }
}
