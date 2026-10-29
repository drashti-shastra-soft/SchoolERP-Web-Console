using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISubjectTypeClientService
    {
        Task<ApiResponse<PagedResult<SubjectTypeModel>>> GetAllSubjectTypeWithPageAsync(SubjectSearchRequest request);
        Task<ApiResponse<SubjectTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(SubjectTypeRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<SubjectTypeModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<dynamic>> CopySubjectTypeAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetSubjectsTypeDropdownListAsync(int? companyId = null, int? sessionId = null);
    }
}
