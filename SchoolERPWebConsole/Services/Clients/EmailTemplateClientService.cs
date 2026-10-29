using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class EmailTemplateClientService : BaseApiClient, IEmailTemplateClientService    
    {
        public EmailTemplateClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<EmailTemplateSaveResponse>> UpsertSMSTemplateAsync(EmailTemplateSaveRequest request)
        {
            return await PostAsync<EmailTemplateSaveResponse>("api/EmailTemplateAPI/Save", request);
        }
        public async Task<ApiResponse<SpResult>> UpdateEmailTemplateAttachmentAsync(EmailTemplateAttachmentRequest request)
        {
            return await PostAsync<SpResult>("api/EmailTemplateAPI/UpdateEmailTemplateAttachment", request);
        }
        public async Task<ApiResponse<EmailTemplateDetailViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<EmailTemplateDetailViewModel>($"api/EmailTemplateAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<EmailTemplateViewModel>>> GetAllSMSTemplateWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<EmailTemplateViewModel>>("api/EmailTemplateAPI/GetAllSMSTemplateWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/EmailTemplateAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/EmailTemplateAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<List<EmailTempletDropdwon>>> GetEmailTemplateToDropdownListAsync(int companyId)
        {
            return await GetAsync<List<EmailTempletDropdwon>>($"api/EmailTemplateAPI/GetEmailTemplateToDropdownList?companyId={companyId}");
        }
    }
}
