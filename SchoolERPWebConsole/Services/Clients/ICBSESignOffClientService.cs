using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICBSESignOffClientService
    {
        Task<ApiResponse<SpResult>> UpsertCBSESignOffAsync(SignOfRequest request);
        Task<ApiResponse<CBSESignOffViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<CBSESignOffViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<CBSESignOffViewModel>>> GetAllCBSESignOffWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> CopyCBSESignOffAsync(CopyRequest request);
    }
}
