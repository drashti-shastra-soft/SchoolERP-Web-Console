using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamGroupClientService
    {
        Task<ApiResponse<PagedResult<ExamGroupViewModel>>> GetAllExamGroupWithPageAsync(ExamListRequest request);
        Task<ApiResponse<ExamGroupViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(ExamGroupRequestModel request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<ExamGroupViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<dynamic>> CopyExamGroupAsync(CopyRequest request);
    }
}
