using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ISectionClientService
    {
        Task<ApiResponse<List<MstSectionViewModel>>> GetAllAsync(bool includeDeleted = false, int sessionId = 0 ,int companyId = 0);
        Task<ApiResponse<List<MstSectionViewModel>>> GetByClassAsync(int classId, int? staffID = null);
        Task<ApiResponse<MstSectionViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(MstSectionUpsertRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyToSessionAsync(SectionCopyRequest request);
        Task<ApiResponse<PagedResult<MstSectionViewModel>>> GetAllSectionWithPagePageAsync(HostelTypeSearchRequest request);
    }
}
