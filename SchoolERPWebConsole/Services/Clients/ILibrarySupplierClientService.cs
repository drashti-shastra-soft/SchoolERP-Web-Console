using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ILibrarySupplierClientService
    {
        Task<ApiResponse<SpResult>> UpsertLibrarySupplierAsync(LibrarySupplierRequest request);
        Task<ApiResponse<LibrarySupplierModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<LibrarySupplierModel>>> GetAllLibrarySupplierWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<LibrarySupplierModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibrarySupplierAsync(CopyForCompanyRequest request);
    }
}
