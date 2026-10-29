using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CostCenterClientService : BaseApiClient, ICostCenterClientService
    {
        public CostCenterClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertCostCenterAsync(CostCenterModelRequest request)
        {
            return await PostAsync<SpResult>("api/CostCenterAPI/Save", request);
        }
        public async Task<ApiResponse<CostCenterModel>> GetByIDAsync(int id)
        {
            return await GetAsync<CostCenterModel>($"api/CostCenterAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<CostCenterModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<CostCenterModel>>($"api/CostCenterAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<CostCenterModel>>> GetAllCostCenterWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<CostCenterModel>>("api/CostCenterAPI/GetAllCostCenterWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/CostCenterAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CostCenterAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyCostCenterAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/CostCenterAPI/CopyCostCenter", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetCostCenterDropdownListAsync(int companyID, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/CostCenterAPI/GetCostCenterDropdownList?companyID={companyID}&sessionId={sessionId}");
        }
    }
}
