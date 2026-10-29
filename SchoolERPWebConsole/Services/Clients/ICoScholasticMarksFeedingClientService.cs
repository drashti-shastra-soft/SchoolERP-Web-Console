using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICoScholasticMarksFeedingClientService
    {
        Task<ApiResponse<dynamic>> UpsertMarksFeedingAsync(CoScholasticMarksFeedingRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<CoScholasticMarksFeedingResponse>>> GetAllCoScholasticMarksFeedingAsync([FromBody] CoScholasticMarksFeedingGetRequest Req);
    }
}
