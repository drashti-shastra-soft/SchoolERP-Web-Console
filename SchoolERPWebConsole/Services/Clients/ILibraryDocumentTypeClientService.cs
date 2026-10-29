using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryDocumentTypeClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibraryDocumentTypeAsync(LibraryDocumentTypeRequest request);
        Task<ApiResponse<LibraryDocumentTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibraryDocumentTypeModel>>> GetAllLibraryDocumentTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibraryDocumentTypeModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibraryDocumentTypeAsync(CopyForCompanyRequest request);
    }
}
