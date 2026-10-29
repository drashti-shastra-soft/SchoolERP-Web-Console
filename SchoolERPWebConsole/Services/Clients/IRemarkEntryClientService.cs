using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IRemarkEntryClientService
    {
        Task<ApiResponse<PagedResult<RemarkMasterViewModel>>> GetAllRemarkWithPageAsync(SubjectSearchRequest request);
        Task<ApiResponse<RemarkMasterViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(RemarkMasterRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
