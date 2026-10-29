using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ISubjectClientService
    {
        Task<ApiResponse<PagedResult<MstSubjectViewModel>>> GetAllAsync(SubjectSearchRequest request);
        Task<ApiResponse<MstSubjectViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(MstSubjectUpsertRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<Dropdowbinding>>> SubjectsDropdowBindAsync(DropdowRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetSubjectGropBySubjectDropdownList(int subjectGroupId);
        Task<ApiResponse<PagedResult<MstSubjectViewModel>>> GetSubjectListForDashboardAsync(SubjectSearchRequest request);
    }
}
