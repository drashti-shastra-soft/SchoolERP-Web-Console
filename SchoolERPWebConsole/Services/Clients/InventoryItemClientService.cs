using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class InventoryItemClientService: BaseApiClient, IInventoryItemClientService
    {
        public InventoryItemClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertInventoryItemAsync(InventoryItemModelRequest request)
        {
            return await PostAsync<SpResult>("api/InventoryItemAPI/Save", request);
        }
        public async Task<ApiResponse<InventoryItemModel>> GetByIDAsync(int id)
        {
            return await GetAsync<InventoryItemModel>($"api/InventoryItemAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<InventoryItemModel>>> GetAllInventoryItemWithPageAsync(SearchInventoryItemRequest request)
        {
            return await PostAsync<PagedResult<InventoryItemModel>>("api/InventoryItemAPI/GetAllInventoryItemWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/InventoryItemAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/InventoryItemAPI/ToggleStatus", request);
        }
    }
}
