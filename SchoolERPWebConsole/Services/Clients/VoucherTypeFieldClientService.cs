using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class VoucherTypeFieldClientService : BaseApiClient, IVoucherTypeFieldClientService
    {
        public VoucherTypeFieldClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertVoucherTypeFieldAsync(VoucherFieldRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherTypeFieldAPI/Save", request);
        }
        public async Task<ApiResponse<VoucherTypeFieldModel>> GetByIDAsync(int id)
        {
            return await GetAsync<VoucherTypeFieldModel>($"api/VoucherTypeFieldAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<VoucherTypeFieldModel>>> GetAllVoucherTypeFielddWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<VoucherTypeFieldModel>>("api/VoucherTypeFieldAPI/GetAllVoucherTypeFielddWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/VoucherTypeFieldAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VoucherTypeFieldAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetVoucherTypeFieldDropdownListAsync(int companyID)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/VoucherTypeFieldAPI/GetVoucherTypeFieldDropdownList?companyID={companyID}");
        }

        public async Task<ApiResponse<List<VoucherDynamicFieldResponse>>> GetVoucherDynamicFieldsAsync(int companyId,int voucherId,int sessionId)
        {
            return await GetAsync<List<VoucherDynamicFieldResponse>>(
                $"api/VoucherTypeFieldAPI/GetVoucherDynamicFields?companyId={companyId}&voucherId={voucherId}&sessionId={sessionId}");
        }
    }
}
