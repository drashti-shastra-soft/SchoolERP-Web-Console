using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IExamMarksheetDownloadPermissionClientService
    {
        Task<ApiResponse<dynamic>> UpsertAsync(PermissionRequest request);
        Task<ApiResponse<List<ExamMarksheetDownloadPermissionViewModel>>> GetAllExamMarksheetDownloadPermissionAsync(ExamGroupGetAllRequest request);
        Task<ApiResponse<ExamMarksheetDownloadPermissionSetAccessResponse>> SetAccessAsync(ExamMarksheetDownloadPermissionSetAccessRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(DeleteRequest request);
    }
}
