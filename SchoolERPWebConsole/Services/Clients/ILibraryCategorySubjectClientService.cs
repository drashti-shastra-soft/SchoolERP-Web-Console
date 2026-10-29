using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryCategorySubjectClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibraryCategorySubjectAsync(LibraryCategorySubjectRequest request);
        Task<ApiResponse<LibraryCategorySubjectModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibraryCategorySubjectModel>>> GetAllLibraryCategorySubjectWithPageAsync(LibraryCategorySubjectSearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibraryCategoryModel>>> GetAllLibraryCategoryAsync(int? companyId = null, bool? isActive = null);
        Task<ApiResponse<List<LibrarySubjectModel>>> GetAllLibrarySubjectAsync(int? companyId = null, bool? isActive = null);
    }
}
