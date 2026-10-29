using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class NoticeBoardClientService : BaseApiClient, INoticeBoardClientService
    {
        public NoticeBoardClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<NoticeBoardSaveResponse>> UpsertNoticeBoardAsync(NoticeBoardRequestModel request)
        {
            return await PostAsync<NoticeBoardSaveResponse>("api/NoticeBoardAPI/Save", request);
        }
        public async Task<ApiResponse<NoticeBoardModel>> GetByIDAsync(int id)
        {
            return await GetAsync<NoticeBoardModel>($"api/NoticeBoardAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<NoticeBoardModel>>> GetAllNoticeBoardWithPageAsync(NoticeBoardSearchRequest request)
        {
            return await PostAsync<PagedResult<NoticeBoardModel>>("api/NoticeBoardAPI/GetAllNoticeBoardWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/NoticeBoardAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/NoticeBoardAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<SpResult>> UpdateNoticeBoardAttachmentAsync(NoticeBoardAttachmentRequest request)
        {
            return await PostAsync<SpResult>("api/NoticeBoardAPI/UpdateNoticeBoardAttachment", request);
        }
    }
}
