using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamGradeClientService
    {
        Task<ApiResponse<ExamGradeResponse>> UpsertAsync(ExamGradeRequest request);
        Task<ApiResponse<List<ExamGradeViewModel>>> GetByFilterAsync(int? companyId = null,
            int? sessionId = null, int? subjectTypeID = null, int? classID = null);
        Task<ApiResponse<ExamGradeCopyResponse>> CopyExamGradeAsync(ExamGradeCopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetExamGradeByClassListAsync(int? companyId = null, int? sessionId = null, int? classId = null);
    }
}
