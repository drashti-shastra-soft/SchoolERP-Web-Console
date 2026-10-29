using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class RemarkEntryClientService : BaseApiClient, IRemarkEntryClientService
    {
        public RemarkEntryClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<RemarkMasterViewModel>>> GetAllRemarkWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<RemarkMasterViewModel>>("api/RemarkMasterAPI/GetAllRemarkWithPage", request);
        }

        public async Task<ApiResponse<RemarkMasterViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<RemarkMasterViewModel>($"api/RemarkMasterAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(RemarkMasterRequest request)
        {
            return await PostAsync<dynamic>("api/RemarkMasterAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/RemarkMasterAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/RemarkMasterAPI/ToggleStatus", request);
        }

    }
}
