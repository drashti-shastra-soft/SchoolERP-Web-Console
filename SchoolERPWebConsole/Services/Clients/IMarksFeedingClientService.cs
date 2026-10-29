using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IMarksFeedingClientService
    {
        Task<ApiResponse<dynamic>> UpsertMarksFeedingAsync(MarksFeedingRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<MarksFeedingResponse>>> GetAllMarksFeedingBindGridAsync([FromBody] MarksFeedingGetRequest Req);
    }
}
