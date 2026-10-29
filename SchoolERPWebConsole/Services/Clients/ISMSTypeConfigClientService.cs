using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISMSTypeConfigClientService
    {
        Task<ApiResponse<SpResult>> SaveBatchAsync(SaveSMSBatchRequest request);
        Task<ApiResponse<List<FieldConfigResponse>>> GetByCompanysmsTypeAsync(int smsTypeId, int companyID);
    }
}
