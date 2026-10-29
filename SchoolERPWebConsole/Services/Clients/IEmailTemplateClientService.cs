using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IEmailTemplateClientService
    {
        Task<ApiResponse<EmailTemplateSaveResponse>> UpsertSMSTemplateAsync(EmailTemplateSaveRequest request);
        Task<ApiResponse<SpResult>> UpdateEmailTemplateAttachmentAsync(EmailTemplateAttachmentRequest request);
        Task<ApiResponse<EmailTemplateDetailViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<EmailTemplateViewModel>>> GetAllSMSTemplateWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<EmailTempletDropdwon>>> GetEmailTemplateToDropdownListAsync(int companyId);
    }
}
