using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IRemarkGroupClientService
    {
        Task<ApiResponse<PagedResult<RemarkGroupViewModel>>> GetAllRemarkGroupWithPageAsync(SubjectSearchRequest request);
        Task<ApiResponse<RemarkGroupViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(RemarkGroupRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetSubjectsTypeDropdownListAsync(int? companyId = null, int? sessionId = null);
    }
}
