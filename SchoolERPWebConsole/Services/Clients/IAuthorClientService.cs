using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IAuthorClientService
    {
        Task<ApiResponse<SpResult>> UpsertAuthorAsync(AuthorRequest request);
        Task<ApiResponse<AuthorModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<AuthorModel>>> GetAllAuthorWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<AuthorModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibraryAuthorAsync(CopyForCompanyRequest request);
    }
}
