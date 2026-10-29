using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISubSubjectClientService
    {
        Task<ApiResponse<PagedResult<SubSubjectViewModel>>> GetAllSubSubjectWithPageAsync(SubjectSearchRequest request);
        Task<ApiResponse<SubSubjectViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(SubSubjectRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetSubSubjectBindDropdownListAsync(int? companyId = null, int? sessionId = null);
    }
}
