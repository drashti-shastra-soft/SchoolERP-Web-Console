using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class VoucherTypeClientService : BaseApiClient, IVoucherTypeClientService
    {
        public VoucherTypeClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertVoucherTypeAsync(VoucherTypeModelRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherTypeAPI/Save", request);
        }
       
        public async Task<ApiResponse<VoucherTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<VoucherTypeModel>($"api/VoucherTypeAPI/GetById/{id}");
        }        

        public async Task<ApiResponse<PagedResult<VoucherTypeModel>>> GetAllVoucherTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<VoucherTypeModel>>("api/VoucherTypeAPI/GetAllVoucherTypeWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/VoucherTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VoucherTypeAPI/ToggleStatus", request);
        }        
        public async Task<ApiResponse<List<DropdownModel>>> GetVoucherTypeDropdownListAsync()
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/VoucherTypeAPI/GetVoucherTypeDropdownList");
        }
    }
}
