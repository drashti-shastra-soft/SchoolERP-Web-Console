using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamClientService
    {
        Task<ApiResponse<PagedResult<ExamViewModel>>> GetAllExamWithPageAsync(ExamListRequest request);
        Task<ApiResponse<ExamViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(ExamRequestModel request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<ExamViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<dynamic>> CopyExamAsync(CopyRequest request);
    }
}
