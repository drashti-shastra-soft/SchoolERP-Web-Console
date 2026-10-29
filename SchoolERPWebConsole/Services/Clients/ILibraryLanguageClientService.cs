using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryLanguageClientService
    {
        Task<ApiResponse<SpResult>> UpsertPublisherAsync(LibraryLanguageRequest request);
        Task<ApiResponse<LibraryLanguageModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibraryLanguageModel>>> GetAllLibraryLanguageWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibraryLanguageModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibraryLanguageAsync(CopyForCompanyRequest request);
    }
}
