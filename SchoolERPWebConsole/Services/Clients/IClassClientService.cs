using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IClassClientService
    {
        Task<ApiResponse<List<MstClassViewModel>>> GetAllAsync(bool includeDeleted = false, int? sessionId = null, int? companyId = null, int? staffID = null);
        Task<ApiResponse<MstClassViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(MstClassUpsertRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<PagedResult<MstClassViewModel>>> GetAllClassWithPageAsync(ClassSearchRequest request);
    }
}
