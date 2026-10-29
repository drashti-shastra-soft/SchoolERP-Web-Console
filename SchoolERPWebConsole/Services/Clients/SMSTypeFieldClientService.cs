using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SMSTypeFieldClientService : BaseApiClient, ISMSTypeFieldClientService
    {
        public SMSTypeFieldClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertSMSTypeAsync(SMSFieldRequest request)
        {
            return await PostAsync<SpResult>("api/SMSTypeFieldAPI/Save", request);
        }
        public async Task<ApiResponse<SMSTypeFieldModel>> GetByIDAsync(int id)
        {
            return await GetAsync<SMSTypeFieldModel>($"api/SMSTypeFieldAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<SMSTypeFieldModel>>> GetAllSMSTypeFieldWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<SMSTypeFieldModel>>("api/SMSTypeFieldAPI/GetAllSMSTypeFieldWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SMSTypeFieldAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SMSTypeFieldAPI/ToggleStatus", request);
        }
    }
}
