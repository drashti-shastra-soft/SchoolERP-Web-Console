using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class MarksFeedingClientService : BaseApiClient, IMarksFeedingClientService
    {
        public MarksFeedingClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<dynamic>> UpsertMarksFeedingAsync(MarksFeedingRequest request)
        {
            return await PostAsync<dynamic>("api/MarksFeedingAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/MarksFeedingAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<MarksFeedingResponse>>> GetAllMarksFeedingBindGridAsync([FromBody] MarksFeedingGetRequest Req)
        {
            return await PostAsync<List<MarksFeedingResponse>>($"api/MarksFeedingAPI/GetAllMarksFeedingBindGrid/", Req!);
        }
    }
}
