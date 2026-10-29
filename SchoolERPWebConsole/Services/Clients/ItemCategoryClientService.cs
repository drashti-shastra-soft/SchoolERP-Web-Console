using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ItemCategoryClientService: BaseApiClient,IItemCategoryClientService
    {
        public ItemCategoryClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertItemCategoryAsync(ItemCategoryModelRequest request)
        {
            return await PostAsync<SpResult>("api/ItemCategoryAPI/Save", request);
        }
        public async Task<ApiResponse<ItemCategoryModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ItemCategoryModel>($"api/ItemCategoryAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<ItemCategoryModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<ItemCategoryModel>>($"api/ItemCategoryAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<ItemCategoryModel>>> GetAllItemCategoryWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<ItemCategoryModel>>("api/ItemCategoryAPI/GetAllItemCategoryWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ItemCategoryAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ItemCategoryAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyItemCategoryAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/ItemCategoryAPI/CopyItemCategory", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetItemCategorDropdownListAsync(int companyId, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/ItemCategoryAPI/GetItemCategorDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
        public async Task<ApiResponse<List<DropdownItemCategoryModel>>> GetItemByItemCategoryDropdownListAsync(int companyId, int sessionId, int itemCategoryId)
        {
            return await GetAsync<List<DropdownItemCategoryModel>>(
                $"api/ItemCategoryAPI/GetItemByItemCategoryDropdownList?companyId={companyId}&sessionId={sessionId}&itemCategoryId={itemCategoryId}");
        }
    }
}
