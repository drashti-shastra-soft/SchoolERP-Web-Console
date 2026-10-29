using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class PromotedClassClientService : BaseApiClient, IPromotedClassClientService
    {
        public PromotedClassClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertPromotedClassAsync(PromotedToClassRequest request)
        {
            return await PostAsync<dynamic>("api/PromotedClassAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/PromotedClassAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<PromotedClassViewModel>>> GetPromotedToClassAsync([FromBody] PromotedToClassGetAllRequest Req)
        {
            return await PostAsync<List<PromotedClassViewModel>>($"api/PromotedClassAPI/GetPromotedToClass/", Req!);
        }
    }
}
