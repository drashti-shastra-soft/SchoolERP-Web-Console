using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class IssueItemClientService : BaseApiClient, IIssueItemClientService
    {
        public IssueItemClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertItemIssueAsync(ItemIssueRequest request)
        {
            return await PostAsync<SpResult>("api/IssueItemAPI/Save", request);
        }
        public async Task<ApiResponse<ItemIssueModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ItemIssueModel>($"api/IssueItemAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<ItemIssueModel>>> GetAllItemIssueWithPageAsync(SearchInventoryItemRequest request)
        {
            return await PostAsync<PagedResult<ItemIssueModel>>("api/IssueItemAPI/GetAllItemIssueWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/IssueItemAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/IssueItemAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<SpResult>> IssueReturnAsync(ItemIssueReturnModel request)
        {
            return await PostAsync<SpResult>("api/IssueItemAPI/IssueReturn", request);
        }
    }
}
