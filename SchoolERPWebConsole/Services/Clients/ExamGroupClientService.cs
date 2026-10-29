using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamGroupClientService : BaseApiClient, IExamGroupClientService
    {
        public ExamGroupClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<ExamGroupViewModel>>> GetAllExamGroupWithPageAsync(ExamListRequest request)
        {
            return await PostAsync<PagedResult<ExamGroupViewModel>>("api/ExamGroupAPI/GetAllExamGroupWithPage", request);
        }

        public async Task<ApiResponse<ExamGroupViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ExamGroupViewModel>($"api/ExamGroupAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(ExamGroupRequestModel request)
        {
            return await PostAsync<dynamic>("api/ExamGroupAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ExamGroupAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ExamGroupAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<ExamGroupViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<ExamGroupViewModel>>($"api/ExamGroupAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<dynamic>> CopyExamGroupAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/ExamGroupAPI/CopyExamGroup", request);
        }
    }
}
