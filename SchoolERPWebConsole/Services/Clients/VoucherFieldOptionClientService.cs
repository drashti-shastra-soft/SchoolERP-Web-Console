using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class VoucherFieldOptionClientService : BaseApiClient, IVoucherFieldOptionClientService
    {
        public VoucherFieldOptionClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertVoucherFieldOptionAsync(VoucherFieldOptionRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherFieldOptionAPI/Save", request);
        }

        public async Task<ApiResponse<VoucherFieldOptionModel>> GetByIDAsync(int id)
        {
            return await GetAsync<VoucherFieldOptionModel>($"api/VoucherFieldOptionAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<VoucherFieldOptionModel>>> GetAllVoucherFieldOptionWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<VoucherFieldOptionModel>>("api/VoucherFieldOptionAPI/GetAllVoucherFieldOptionWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/VoucherFieldOptionAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VoucherFieldOptionAPI/ToggleStatus", request);
        }


        public async Task<ApiResponse<List<VoucherFieldOptionResponse>>> GetLinkedOptionsAsync(int fieldId,
    string optionValue,
    int? companyId,
    int? sessionId)
        {
            return await GetAsync<List<VoucherFieldOptionResponse>>(
                $"api/VoucherFieldOptionAPI/GetLinkedOptions?fieldId={fieldId}&optionValue={optionValue}&companyId={companyId}&sessionId={sessionId}");
        }
    }
}
