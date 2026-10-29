using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IPaymentTypeConfigClientService
    {
        Task<ApiResponse<SpResult>> SaveBatchAsync(SaveBatchRequest request);
        Task<ApiResponse<List<FieldConfigResponse>>> GetByCompanyPaymentTypeAsync(int paymentTypeId, int companyID);
    }
}
