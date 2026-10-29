using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class FeeTypeClientService : BaseApiClient, IFeeTypeClientService
    {
        public FeeTypeClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertFeeTypeAsync(FeeTypeRequest request)
        {
            return await PostAsync<SpResult>("api/FeeTypeAPI/Save", request);
        }

        public async Task<ApiResponse<FeeTypeViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<FeeTypeViewModel>($"api/FeeTypeAPI/GetById/{id}");
        }


        public async Task<ApiResponse<PagedResult<FeeTypeViewModel>>> GetAllFeeTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<FeeTypeViewModel>>("api/FeeTypeAPI/GetAllFeeTypeWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/FeeTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/FeeTypeAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetFeeTypeDropdownListAsync(int? companyId = null, int? sessionID = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/FeeTypeAPI/GetFeeTypeDropdownList?companyId={companyId}&sessionID={sessionID}");
        }
    }
}
