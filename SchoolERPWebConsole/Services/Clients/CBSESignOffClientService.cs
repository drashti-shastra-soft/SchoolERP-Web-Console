using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CBSESignOffClientService : BaseApiClient, ICBSESignOffClientService
    {
        public CBSESignOffClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertCBSESignOffAsync(SignOfRequest request)
        {
            return await PostAsync<SpResult>("api/CBSESignOffAPI/Save", request);
        }
        
        public async Task<ApiResponse<CBSESignOffViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<CBSESignOffViewModel>($"api/CBSESignOffAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<CBSESignOffViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<CBSESignOffViewModel>>($"api/CBSESignOffAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<CBSESignOffViewModel>>> GetAllCBSESignOffWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<CBSESignOffViewModel>>("api/CBSESignOffAPI/GetAllCBSESignOffWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/CBSESignOffAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CBSESignOffAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyCBSESignOffAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/CBSESignOffAPI/CopyCBSESignOff", request);
        }
    }
}
