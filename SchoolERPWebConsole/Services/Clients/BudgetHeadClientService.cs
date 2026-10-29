using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class BudgetHeadClientService : BaseApiClient, IBudgetHeadClientService
    {
        public BudgetHeadClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertBudgetHeadAsync(BudgetHeadModelRequest request)
        {
            return await PostAsync<SpResult>("api/BudgetHeadAPI/Save", request);
        }
        public async Task<ApiResponse<BudgetHeadModel>> GetByIDAsync(int id)
        {
            return await GetAsync<BudgetHeadModel>($"api/BudgetHeadAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<BudgetHeadModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<BudgetHeadModel>>($"api/BudgetHeadAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<BudgetHeadModel>>> GetAllBudgetHeadWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<BudgetHeadModel>>("api/BudgetHeadAPI/GetAllBudgetHeadWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/BudgetHeadAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/BudgetHeadAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyBudgetHeadAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/BudgetHeadAPI/CopyBudgetHead", request);
        }
    }
}
