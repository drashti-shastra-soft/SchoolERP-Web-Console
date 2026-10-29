using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamConfigClientService
    {
        Task<ApiResponse<dynamic>> UpsertAsync(ExamConfigRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<ExamConfigViewModel>>> GetExamConfigByClassAsync(int? companyId = null, int? sessionId = null, int? classID = null);
        Task<ApiResponse<dynamic>> CopyExamConfigAsync(ExamConfigCopyRequest request);
        Task<ApiResponse<ExamConfigViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<ExamConfigViewModel>>> GetAllExamConfigWithPageAsync(ExamConfigListRequest request);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<SubjectWithPaperMarksResponse>>> GetAllExamSubjectPaperMarksListAsync(int? companyId = null, int? sessionId = null, int? classID = null, int? sectionId = null, int? examId = null);
        Task<ApiResponse<List<SubjectWithPaperMarksResponse>>> GetAllExamBySubjectIdListAsync(int? companyId = null, int? sessionId = null, int? classID = null, int? subjectID = null);
    }
}
