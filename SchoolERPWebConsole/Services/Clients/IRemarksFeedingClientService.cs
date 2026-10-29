using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IRemarksFeedingClientService
    {
        Task<ApiResponse<dynamic>> UpsertRemarksFeedingAPIAsync(RemarksFeedingRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<RemarksFeedingViewModel>>> GetAllRemarksFeedingAsync([FromBody] AttendanceFeedingRequest Req);
    }
}
