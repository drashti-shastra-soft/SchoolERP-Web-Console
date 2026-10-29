using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ISubjectGroupClientService
    {
        Task<ApiResponse<List<MstSubjectGroupViewModel>>> GetAllAsync(bool includeDeleted = false, int? sessionId = null, int? companyId = null);
        Task<ApiResponse<MstSubjectGroupViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(MstSubjectGroupUpsertRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetAllSubjectByClassandSectionIdAsync(int companyId, int sessionId, int classId, int sectionId);
        Task<ApiResponse<PagedResult<MstSubjectGroupViewModel>>> GetAllSubjectGroupWithPageAsync(SubjectGroupSearchRequest request);
    }
}
