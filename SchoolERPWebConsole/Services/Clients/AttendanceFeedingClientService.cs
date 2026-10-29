using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class AttendanceFeedingClientService : BaseApiClient, IAttendanceFeedingClientService
    {
        public AttendanceFeedingClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertAttendanceFeedingAsync(AttendanceFeedingAddRequest request)
        {
            return await PostAsync<dynamic>("api/AttendanceFeedingAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/AttendanceFeedingAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<AttendanceFeedingViewModel>>> GetAllAttendanceFeedingAsync([FromBody] AttendanceFeedingRequest Req)
        {
            return await PostAsync<List<AttendanceFeedingViewModel>>($"api/AttendanceFeedingAPI/GetAllCoScholasticMarksFeeding/", Req!);
        }
    }
}
