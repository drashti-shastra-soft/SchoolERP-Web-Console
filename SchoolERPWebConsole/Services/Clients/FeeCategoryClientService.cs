using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeCategoryClientService : BaseApiClient, IFeeCategoryClientService
    {
        public FeeCategoryClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertFeeCategoryAsync(FeeCategoryRequest request)
        {
            return await PostAsync<SpResult>("api/FeeCategoryAPI/Save", request);
        }

        public async Task<ApiResponse<FeeCategoryViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<FeeCategoryViewModel>($"api/FeeCategoryAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<FeeCategoryViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<FeeCategoryViewModel>>($"api/FeeCategoryAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<FeeCategoryViewModel>>> GetAllFeeCategoryWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<FeeCategoryViewModel>>("api/FeeCategoryAPI/GetAllFeeCategoryWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/FeeCategoryAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/FeeCategoryAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyFeeCategoryAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/FeeCategoryAPI/CopyFeeCategory", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetFeeCategoryDropdownListAsync(int? companyId = null, int? sessionID = null, int? categoryGroupId=null)
        {
            return await GetAsync<List<DropdownModel>>($"api/FeeCategoryAPI/GetFeeCategoryDropdownList?companyId={companyId}&sessionID={sessionID}&categoryGroupId={categoryGroupId}");
        }
    }
}
