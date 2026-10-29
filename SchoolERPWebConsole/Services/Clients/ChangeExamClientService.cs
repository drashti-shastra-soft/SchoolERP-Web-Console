using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ChangeExamClientService : BaseApiClient, IChangeExamClientService
    {
        public ChangeExamClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertChangeExamAsync(ExamMappingRequest request)
        {
            return await PostAsync<dynamic>("api/ChangeExamAPI/Upsert", request);
        }

        public async Task<ApiResponse<List<StudentResponse>>> GetAllChangeExamAsync([FromBody] ChangeExamRequest Req)
        {
            return await PostAsync<List<StudentResponse>>($"api/ChangeExamAPI/GetAllChangeExam/", Req!);
        }
    }
}
