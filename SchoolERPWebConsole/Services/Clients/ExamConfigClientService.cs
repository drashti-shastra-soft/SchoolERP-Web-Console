using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamConfigClientService : BaseApiClient, IExamConfigClientService
    {
        public ExamConfigClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertAsync(ExamConfigRequest request)
        {
            return await PostAsync<dynamic>("api/ExamConfigAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ExamConfigAPI/Delete/", ids!);
        }
        public async Task<ApiResponse<List<ExamConfigViewModel>>> GetExamConfigByClassAsync(int? companyId = null, int? sessionId = null, int? classID=null)
        {
            return await GetAsync<List<ExamConfigViewModel>>($"api/ExamConfigAPI/GetExamConfigByClass?companyId={companyId}&sessionId={sessionId}&classID={classID}");
        }

        public async Task<ApiResponse<dynamic>> CopyExamConfigAsync(ExamConfigCopyRequest request)
        {
            return await PostAsync<dynamic>("api/ExamConfigAPI/CopyExamConfig", request);
        }

        public async Task<ApiResponse<ExamConfigViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ExamConfigViewModel>($"api/ExamConfigAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<PagedResult<ExamConfigViewModel>>> GetAllExamConfigWithPageAsync(ExamConfigListRequest request)
        {
            return await PostAsync<PagedResult<ExamConfigViewModel>>("api/ExamConfigAPI/GetAllExamConfigWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ExamConfigAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<SubjectWithPaperMarksResponse>>> GetAllExamSubjectPaperMarksListAsync(int? companyId = null, int? sessionId = null, int? classID = null, int? sectionId = null, int? examId = null)
        {
            return await GetAsync<List<SubjectWithPaperMarksResponse>>($"api/ExamConfigAPI/GetAllExamSubjectPaperMarksList?companyId={companyId}&sessionId={sessionId}&classID={classID}&sectionId={sectionId}&examId={examId}");
        }

        public async Task<ApiResponse<List<SubjectWithPaperMarksResponse>>> GetAllExamBySubjectIdListAsync(int? companyId = null, int? sessionId = null, int? classID = null, int? subjectID = null)
        {
            return await GetAsync<List<SubjectWithPaperMarksResponse>>($"api/ExamConfigAPI/GetAllExamBySubjectIdList?companyId={companyId}&sessionId={sessionId}&classID={classID}&subjectID={subjectID}");
        }
    }
}
