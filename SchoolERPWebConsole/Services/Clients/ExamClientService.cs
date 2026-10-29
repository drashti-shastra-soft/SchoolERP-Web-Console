using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamClientService : BaseApiClient, IExamClientService
    {
        public ExamClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<ExamViewModel>>> GetAllExamWithPageAsync(ExamListRequest request)
        {
            return await PostAsync<PagedResult<ExamViewModel>>("api/ExamAPI/GetAllExamWithPage", request);
        }

        public async Task<ApiResponse<ExamViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ExamViewModel>($"api/ExamAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(ExamRequestModel request)
        {
            return await PostAsync<dynamic>("api/ExamAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ExamAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ExamAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<ExamViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<ExamViewModel>>($"api/ExamAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<dynamic>> CopyExamAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/ExamAPI/CopyExam", request);
        }
    }
}
