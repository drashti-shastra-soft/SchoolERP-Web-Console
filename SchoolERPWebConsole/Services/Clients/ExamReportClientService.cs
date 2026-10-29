using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamReportClientService : BaseApiClient, IExamReportClientService
    {
        public ExamReportClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<ExamTermReportCardResponse>> GetExamTermReportCardAsync(
    ExamTermReportCardRequest req)
        {
            var url =
                $"api/ExamReportAPI/GetExamTermReportCard" +
                $"?CompanyID={req.CompanyID}" +
                $"&SessionID={req.SessionID}" +
                $"&ClassID={req.ClassID}" +
                $"&SectionID={req.SectionID}" +
                $"&ExamGroupID={req.ExamGroupID}" +
                $"&StudentID={req.StudentID}" +
                $"&UseWeightage={req.UseWeightage}" +
                $"&ShowPromotion={req.ShowPromotion}";

            return await GetAsync<ExamTermReportCardResponse>(url);
        }
    }
}
