using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class PaperMarksDetailsClientService: BaseApiClient, IPaperMarksDetailsClientService
    {
        public PaperMarksDetailsClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<PaperMarksDetailsViewModel>>> GetAllRemarkWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<PaperMarksDetailsViewModel>>("api/PaperMarksDetailsAPI/GetAllRemarkWithPage", request);
        }

        public async Task<ApiResponse<PaperMarksDetailsViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<PaperMarksDetailsViewModel>($"api/PaperMarksDetailsAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(PaperMarksDetailsSaveRequest request)
        {
            return await PostAsync<dynamic>($"api/PaperMarksDetailsAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/PaperMarksDetailsAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/PaperMarksDetailsAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<dynamic>> CopyPaperMarksDetailsAsync(PaperMarksDetailsCopyRequest request)
        {
            return await PostAsync<dynamic>($"api/PaperMarksDetailsAPI/CopyPaperMarksDetails", request);
        }
    }
}
