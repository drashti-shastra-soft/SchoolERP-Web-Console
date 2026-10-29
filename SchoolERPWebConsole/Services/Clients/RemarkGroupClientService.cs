using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class RemarkGroupClientService : BaseApiClient, IRemarkGroupClientService
    {
        public RemarkGroupClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<RemarkGroupViewModel>>> GetAllRemarkGroupWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<RemarkGroupViewModel>>("api/RemarkGroupAPI/GetAllRemarkGroupWithPage", request);
        }

        public async Task<ApiResponse<RemarkGroupViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<RemarkGroupViewModel>($"api/RemarkGroupAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(RemarkGroupRequest request)
        {
            return await PostAsync<dynamic>("api/RemarkGroupAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/RemarkGroupAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/RemarkGroupAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetSubjectsTypeDropdownListAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/RemarkGroupAPI/GetSubjectsTypeDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
    }
}
