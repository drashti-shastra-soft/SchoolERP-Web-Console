using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamReportClientService
    {
        Task<ApiResponse<ExamTermReportCardResponse>> GetExamTermReportCardAsync(
    ExamTermReportCardRequest req);
    }
}
