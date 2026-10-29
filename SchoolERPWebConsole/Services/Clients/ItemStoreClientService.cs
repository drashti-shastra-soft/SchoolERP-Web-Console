using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ItemStoreClientService : BaseApiClient, IItemStoreClientService
    {
        public ItemStoreClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertItemStoreAsync(ItemStoreModelRequest request)
        {
            return await PostAsync<SpResult>("api/ItemStoreAPI/Save", request);
        }
        public async Task<ApiResponse<ItemStoreModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ItemStoreModel>($"api/ItemStoreAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<ItemStoreModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<ItemStoreModel>>($"api/ItemStoreAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<ItemStoreModel>>> GetAllItemStoreWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<ItemStoreModel>>("api/ItemStoreAPI/GetAllItemStoreWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ItemStoreAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ItemStoreAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyItemStoreAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/ItemStoreAPI/CopyItemStore", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetItemByItemStoreDropdownListAsync(int companyId, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/ItemStoreAPI/GetItemByItemStoreDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
    }
}
