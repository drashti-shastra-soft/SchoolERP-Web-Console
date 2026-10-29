using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SMSTypeConfigClientService : BaseApiClient, ISMSTypeConfigClientService
    {
        public SMSTypeConfigClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> SaveBatchAsync(SaveSMSBatchRequest request)
        {
            return await PostAsync<SpResult>($"api/SMSTypeConfigAPI/SaveBatch", request);
        }
        public async Task<ApiResponse<List<FieldConfigResponse>>> GetByCompanysmsTypeAsync(int smsTypeId, int companyID)
        {
            return await GetAsync<List<FieldConfigResponse>>(
                $"api/SMSTypeConfigAPI/GetByCompanysmsType?smsTypeId={smsTypeId}&companyID={companyID}");
        }
    }
}
