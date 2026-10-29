using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ItemSupplierClientService: BaseApiClient, IItemSupplierClientService
    {
        public ItemSupplierClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertItemSupplierAsync(ItemSupplierRequest request)
        {
            return await PostAsync<SpResult>("api/ItemSupplierAPI/Save", request);
        }
        public async Task<ApiResponse<ItemSupplierModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ItemSupplierModel>($"api/ItemSupplierAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<ItemSupplierModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<ItemSupplierModel>>($"api/ItemSupplierAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<ItemSupplierModel>>> GetAllItemSupplierWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<ItemSupplierModel>>("api/ItemSupplierAPI/GetAllItemSupplierWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ItemSupplierAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ItemSupplierAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyItemSupplierAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/ItemSupplierAPI/CopyItemSupplier", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetItemSupplierDropdownListAsync(int companyId, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/ItemSupplierAPI/GetItemSupplierDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
    }
}
