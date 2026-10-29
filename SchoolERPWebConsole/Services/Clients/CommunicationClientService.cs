using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CommunicationClientService: BaseApiClient, ICommunicationClientService
    {
        public CommunicationClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<CommunicationSaveResponse>> UpsertCommunicationAsync(CommunicationSaveRequest request)
        {
            return await PostAsync<CommunicationSaveResponse>("api/CommunicationAPI/Save", request);
        }

        public async Task<ApiResponse<List<BirthdayTodayResponse>>> GetTodayBirthdaysAsync(BirthdayTodayRequest request)
        {
            return await PostAsync<List<BirthdayTodayResponse>>("api/CommunicationAPI/GetTodayBirthdays", request);
        }

        public async Task<ApiResponse<PagedResult<CommunicationLogResponse>>> GetCommunicationLogWithPageAsync(CommunicationLogRequest request)
        {
            return await PostAsync<PagedResult<CommunicationLogResponse>>("api/CommunicationAPI/GetCommunicationLogWithPage", request);
        }
    }
}
