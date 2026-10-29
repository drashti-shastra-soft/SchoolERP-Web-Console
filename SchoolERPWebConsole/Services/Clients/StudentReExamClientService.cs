using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class StudentReExamClientService : BaseApiClient, IStudentReExamClientService
    {
        public StudentReExamClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertStudentReExamAsync(StudentReExamRequest request)
        {
            return await PostAsync<dynamic>("api/StudentReExamAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/StudentReExamAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<List<StudentReExamViewModel>>> GetAllStudentReExamAsync([FromBody] StudentReExamRequestModel Req)
        {
            return await PostAsync<List<StudentReExamViewModel>>($"api/StudentReExamAPI/GetAllStudentReExam/", Req!);
        }
    }
}
