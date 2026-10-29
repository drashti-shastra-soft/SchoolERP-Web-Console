using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class RemarksFeedingClientService : BaseApiClient, IRemarksFeedingClientService
    {
        public RemarksFeedingClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertRemarksFeedingAPIAsync(RemarksFeedingRequest request)
        {
            return await PostAsync<dynamic>("api/RemarksFeedingAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/RemarksFeedingAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<RemarksFeedingViewModel>>> GetAllRemarksFeedingAsync([FromBody] AttendanceFeedingRequest Req)
        {
            return await PostAsync<List<RemarksFeedingViewModel>>($"api/RemarksFeedingAPI/GetAllRemarksFeeding/", Req!);
        }
    }
}
