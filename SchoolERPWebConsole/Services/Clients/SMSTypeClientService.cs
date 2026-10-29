using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SMSTypeClientService : BaseApiClient, ISMSTypeClientService
    {
        public SMSTypeClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<UpsertSMSTypeResponse>> UpsertSMSTypeAsync(SMSTypeRequest request)
        {
            return await PostAsync<UpsertSMSTypeResponse>("api/SMSTypeAPI/Save", request);
        }
        public async Task<ApiResponse<SMSTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<SMSTypeModel>($"api/SMSTypeAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<SMSTypeModel>>> GetAllSMSTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<SMSTypeModel>>("api/SMSTypeAPI/GetAllSMSTypeWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SMSTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SMSTypeAPI/ToggleStatus", request);
        }
        public Task<ApiResponse<dynamic>> UpsertSMSAttachmentFileAsync(SMSTypeAttachmentUpsertRequest req)
           => PostAsync<dynamic>("api/SMSTypeAPI/UpsertSMSAttachmentFile", req);

        public async Task<ApiResponse<List<DropdownModel>>> GetSMSTypeDropdownListAsync()
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/SMSTypeAPI/GetSMSTypeDropdownList");
        }
        public async Task<ApiResponse<List<SMSTypeModel>>> GetAllAsync()
        {
            return await GetAsync<List<SMSTypeModel>>(
                $"api/SMSTypeAPI/GetAll");
        }
    }
}
