using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICommunicationClientService
    {
        Task<ApiResponse<CommunicationSaveResponse>> UpsertCommunicationAsync(CommunicationSaveRequest request);
        Task<ApiResponse<List<BirthdayTodayResponse>>> GetTodayBirthdaysAsync(BirthdayTodayRequest request);
        Task<ApiResponse<PagedResult<CommunicationLogResponse>>> GetCommunicationLogWithPageAsync(CommunicationLogRequest request);
    }
}
