using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ExamMarksheetDownloadPermissionClientService : BaseApiClient, IExamMarksheetDownloadPermissionClientService
    {
        public ExamMarksheetDownloadPermissionClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<List<ExamMarksheetDownloadPermissionViewModel>>> GetAllExamMarksheetDownloadPermissionAsync(ExamGroupGetAllRequest request)
        {
            return await PostAsync<List<ExamMarksheetDownloadPermissionViewModel>>($"api/ExamMarksheetDownloadPermissionAPI/GetAllExamMarksheetDownloadPermission", request);
        }
        public async Task<ApiResponse<dynamic>> UpsertAsync(PermissionRequest request)
        {
            return await PostAsync<dynamic>("api/ExamMarksheetDownloadPermissionAPI/Upsert", request);
        }

        public async Task<ApiResponse<ExamMarksheetDownloadPermissionSetAccessResponse>> SetAccessAsync(ExamMarksheetDownloadPermissionSetAccessRequest request)
        {
            return await PostAsync<ExamMarksheetDownloadPermissionSetAccessResponse>("api/ExamMarksheetDownloadPermissionAPI/SetAccess", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(DeleteRequest request)
        {
            return await PostAsync<dynamic>($"api/ExamMarksheetDownloadPermissionAPI/Delete/", request!);
        }
    }
}
