using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamGradeClientService : BaseApiClient, IExamGradeClientService
    {
        public ExamGradeClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<ExamGradeResponse>> UpsertAsync(ExamGradeRequest request)
        {
            return await PostAsync<ExamGradeResponse>("api/ExamGradeAPI/Upsert", request);
        }
        public async Task<ApiResponse<List<ExamGradeViewModel>>> GetByFilterAsync(int? companyId = null,
            int? sessionId = null, int? subjectTypeID=null, int? classID = null)
        {
            return await GetAsync<List<ExamGradeViewModel>>($"api/ExamGradeAPI/GetByFilter?companyId={companyId}&sessionId={sessionId}&subjectTypeID={subjectTypeID}&classID={classID}");
        }

        public async Task<ApiResponse<ExamGradeCopyResponse>> CopyExamGradeAsync(ExamGradeCopyRequest request)
        {
            return await PostAsync<ExamGradeCopyResponse>("api/ExamGradeAPI/CopyExamGrade", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetExamGradeByClassListAsync(int? companyId = null, int? sessionId = null, int? classId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/ExamGradeAPI/GetExamGradeByClassList?companyId={companyId}&sessionId={sessionId}&classId={classId}");
        }
    }
}
