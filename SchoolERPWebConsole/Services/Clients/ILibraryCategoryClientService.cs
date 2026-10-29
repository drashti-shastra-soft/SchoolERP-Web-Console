using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryCategoryClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibraryCategoryAsync(LibraryCategoryRequest request);
        Task<ApiResponse<LibraryCategoryModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibraryCategoryModel>>> GetAllLibraryCategoryWithPagePageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibraryCategoryModel>>> GetAllAsync(
           int companyId,
           bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibraryCategoryAsync(CopyForCompanyRequest request);
    }
}
