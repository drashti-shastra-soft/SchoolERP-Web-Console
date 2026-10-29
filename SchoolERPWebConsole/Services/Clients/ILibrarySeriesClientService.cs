using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibrarySeriesClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibrarySeriesAsync(LibrarySeriesRequest request);
        Task<ApiResponse<LibrarySeriesModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibrarySeriesModel>>> GetAllLibrarySeriesWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibrarySeriesModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibrarySeriesAsync(CopyForCompanyRequest request);
    }
}
