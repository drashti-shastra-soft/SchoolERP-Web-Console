using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IAttendanceFeedingClientService
    {
        Task<ApiResponse<dynamic>> UpsertAttendanceFeedingAsync(AttendanceFeedingAddRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<AttendanceFeedingViewModel>>> GetAllAttendanceFeedingAsync([FromBody] AttendanceFeedingRequest Req);
    }
}
