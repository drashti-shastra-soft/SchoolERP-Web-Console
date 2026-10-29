using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ItemStockClientService : BaseApiClient, IItemStockClientService
    {
        public ItemStockClientService(HttpClient client) : base(client) { }

        
        public Task<ApiResponse<UpsertItemStockResponse>> UpsertItemStockAsync(ItemStockModelRequest req)
           => PostAsync<UpsertItemStockResponse>("api/ItemStockAPI/Save", req);

        public async Task<ApiResponse<ItemStockModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ItemStockModel>($"api/ItemStockAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<ItemStockModel>>> GetAllItemStockWithPageAsync(SearchItemStockRequest request)
        {
            return await PostAsync<PagedResult<ItemStockModel>>("api/ItemStockAPI/GetAllItemStockWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ItemStockAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ItemStockAPI/ToggleStatus", request);
        }
        public Task<ApiResponse<dynamic>> UpsertPostalDispatchAttachmentFileAsync(ItemStockAttachmentUpsertRequest req)
           => PostAsync<dynamic>("api/ItemStockAPI/UpsertPostalDispatchAttachmentFile", req);
    }
}
