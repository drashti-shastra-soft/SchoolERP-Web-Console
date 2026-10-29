using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibraryDocumentStatusClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibraryDocumentStatusAsync(LibraryDocumentStatusRequest request);
        Task<ApiResponse<LibraryDocumentStatusModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibraryDocumentStatusModel>>> GetAllDocumentStatusWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibraryDocumentStatusModel>>> GetAllAsync(int companyId);
        Task<ApiResponse<SpResult>> CopyDocumentStatusAsync(CopyForCompanyRequest request);
    }
}
