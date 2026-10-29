using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeHeadClientService : BaseApiClient, IFeeHeadClientService
    {
        public FeeHeadClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertFeeCategoryAsync(FeeHeadRequest request)
        {
            return await PostAsync<SpResult>("api/FeeHeadAPI/Save", request);
        }

        public async Task<ApiResponse<FeeHeadViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<FeeHeadViewModel>($"api/FeeHeadAPI/GetById/{id}");
        }

       
        public async Task<ApiResponse<PagedResult<FeeHeadViewModel>>> GetAllFeeHeadWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<FeeHeadViewModel>>("api/FeeHeadAPI/GetAllFeeHeadWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/FeeHeadAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/FeeHeadAPI/ToggleStatus", request);
        }
        
        public async Task<ApiResponse<List<DropdownModel>>> GetFeeHeadDropdownListAsync(int? companyId = null, int? sessionID = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/FeeHeadAPI/GetFeeHeadDropdownList?companyId={companyId}&sessionID={sessionID}");
        }
    }
}
