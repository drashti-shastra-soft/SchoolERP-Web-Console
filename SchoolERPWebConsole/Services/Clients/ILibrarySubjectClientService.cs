using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibrarySubjectClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibrarySubjectAsync(LibrarySubjectRequest request);
        Task<ApiResponse<LibrarySubjectModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibrarySubjectModel>>> GetAllLibrarySubjectWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibrarySubjectModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibrarySubjectAsync(CopyForCompanyRequest request);
    }
}
