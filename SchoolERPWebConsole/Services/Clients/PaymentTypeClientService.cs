using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class PaymentTypeClientService : BaseApiClient, IPaymentTypeClientService
    {
        public PaymentTypeClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<UpsertPaymentTypeResponse>> UpsertPaymentTypeAsync(PaymentTypeRequest request)
        {
            return await PostAsync<UpsertPaymentTypeResponse>("api/PaymentTypeAPI/Save", request);
        }

        public async Task<ApiResponse<PaymentTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<PaymentTypeModel>($"api/PaymentTypeAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<PaymentTypeModel>>> GetAllPaymentTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<PaymentTypeModel>>("api/PaymentTypeAPI/GetAllPaymentTypeWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/PaymentTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/PaymentTypeAPI/ToggleStatus", request);
        }
        public Task<ApiResponse<dynamic>> UpsertPaymentTypeAttachmentFileAsync(PaymentTypeAttachmentUpsertRequest req)
           => PostAsync<dynamic>("api/PaymentTypeAPI/UpsertPaymentTypeAttachmentFile", req);

        public async Task<ApiResponse<List<DropdownModel>>> GetPaymenTypeDropdownListAsync()
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/PaymentTypeAPI/GetPaymenTypeDropdownList");
        }
        public async Task<ApiResponse<List<PaymentTypeModel>>> GetAllAsync()
        {
            return await GetAsync<List<PaymentTypeModel>>(
                $"api/PaymentTypeAPI/GetAll");
        }
    }
}
