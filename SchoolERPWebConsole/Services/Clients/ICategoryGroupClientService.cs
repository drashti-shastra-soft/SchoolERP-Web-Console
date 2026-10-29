using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICategoryGroupClientService
    {
        Task<ApiResponse<SpResult>> UpsertCategoryGroupAsync(CategoryGroupRequest request);
        Task<ApiResponse<CategoryGroupViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<CategoryGroupViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<CategoryGroupViewModel>>> GetAllCategoryGroupWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyCategoryGroupAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetCategoryGroupDropdownListAsync(int? companyId = null, int? sessionID=null);
    }
}
