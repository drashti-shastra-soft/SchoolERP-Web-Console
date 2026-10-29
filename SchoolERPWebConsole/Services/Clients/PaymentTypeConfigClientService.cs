using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class PaymentTypeConfigClientService : BaseApiClient, IPaymentTypeConfigClientService
    {
        public PaymentTypeConfigClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> SaveBatchAsync(SaveBatchRequest request)
        {
            return await PostAsync<SpResult>($"api/PaymentTypeConfigAPI/SaveBatch", request);
        }
        public async Task<ApiResponse<List<FieldConfigResponse>>> GetByCompanyPaymentTypeAsync(int paymentTypeId, int companyID)
        {
            return await GetAsync<List<FieldConfigResponse>>(
                $"api/PaymentTypeConfigAPI/GetByCompanyPaymentType?paymentTypeId={paymentTypeId}&companyID={companyID}");
        }
    }
}
