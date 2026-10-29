using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CoScholasticMarksFeedingClientService: BaseApiClient, ICoScholasticMarksFeedingClientService
    {
        public CoScholasticMarksFeedingClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<dynamic>> UpsertMarksFeedingAsync(CoScholasticMarksFeedingRequest request)
        {
            return await PostAsync<dynamic>("api/CoScholasticMarksFeedingAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/CoScholasticMarksFeedingAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<CoScholasticMarksFeedingResponse>>> GetAllCoScholasticMarksFeedingAsync([FromBody] CoScholasticMarksFeedingGetRequest Req)
        {
            return await PostAsync<List<CoScholasticMarksFeedingResponse>>($"api/CoScholasticMarksFeedingAPI/GetAllCoScholasticMarksFeeding/", Req!);
        }
    }
}
