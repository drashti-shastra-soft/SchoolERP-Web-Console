using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISMSTemplateClientService
    {
        Task<ApiResponse<SpResult>> UpsertSMSTemplateAsync(SMSTemplateSaveRequest request);
        Task<ApiResponse<SMSTemplateViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<SMSTemplateViewModel>>> GetAllSMSTemplateWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<EmailTempletDropdwon>>> GetSMSTemplateToDropdownListAsync(int companyId);
    }
}
