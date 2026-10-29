using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IPaperMarksDetailsClientService
    {
        Task<ApiResponse<dynamic>> UpsertAsync(PaperMarksDetailsSaveRequest request);
        Task<ApiResponse<dynamic>> CopyPaperMarksDetailsAsync(PaperMarksDetailsCopyRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<PaperMarksDetailsViewModel>> GetByIDAsync(int id);
    }
}
