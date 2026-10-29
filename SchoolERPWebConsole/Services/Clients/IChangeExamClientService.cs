using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IChangeExamClientService
    {
        Task<ApiResponse<dynamic>> UpsertChangeExamAsync(ExamMappingRequest request);
        Task<ApiResponse<List<StudentResponse>>> GetAllChangeExamAsync([FromBody] ChangeExamRequest Req);
    }
}
