using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IStudentReExamClientService
    {
        Task<ApiResponse<dynamic>> UpsertStudentReExamAsync(StudentReExamRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<StudentReExamViewModel>>> GetAllStudentReExamAsync([FromBody] StudentReExamRequestModel Req);
    }
}
