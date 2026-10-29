using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IClassSubSubjectClientService
    {
        Task<ApiResponse<PagedResult<ClassSubSubjectViewModel>>> GetAllClassSubSubjectWithPageAsync(SubjectSearchRequest request);
        Task<ApiResponse<ClassSubSubjectViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(ClassSubSubjectRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
