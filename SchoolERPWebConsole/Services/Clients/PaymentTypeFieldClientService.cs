using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class PaymentTypeFieldClientService : BaseApiClient, IPaymentTypeFieldClientService
    {
        public PaymentTypeFieldClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertPaymentTypeAsync(PaymentFieldRequest request)
        {
            return await PostAsync<SpResult>("api/PaymentTypeFieldAPI/Save", request);
        }

        public async Task<ApiResponse<PaymentTypeFieldModel>> GetByIDAsync(int id)
        {
            return await GetAsync<PaymentTypeFieldModel>($"api/PaymentTypeFieldAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<PaymentTypeFieldModel>>> GetAllPaymentTypeFieldWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<PaymentTypeFieldModel>>("api/PaymentTypeFieldAPI/GetAllPaymentTypeFieldWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/PaymentTypeFieldAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/PaymentTypeFieldAPI/ToggleStatus", request);
        }
    }
}
