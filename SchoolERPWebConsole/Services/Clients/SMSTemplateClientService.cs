using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SMSTemplateClientService : BaseApiClient, ISMSTemplateClientService
    {
        public SMSTemplateClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertSMSTemplateAsync(SMSTemplateSaveRequest request)
        {
            return await PostAsync<SpResult>("api/SMSTemplateAPI/Save", request);
        }
        public async Task<ApiResponse<SMSTemplateViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<SMSTemplateViewModel>($"api/SMSTemplateAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<SMSTemplateViewModel>>> GetAllSMSTemplateWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<SMSTemplateViewModel>>("api/SMSTemplateAPI/GetAllSMSTemplateWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SMSTemplateAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SMSTemplateAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<EmailTempletDropdwon>>> GetSMSTemplateToDropdownListAsync(int companyId)
        {
            return await GetAsync<List<EmailTempletDropdwon>>($"api/SMSTemplateAPI/GetSMSTemplateToDropdownList?companyId={companyId}");
        }
    }
}
