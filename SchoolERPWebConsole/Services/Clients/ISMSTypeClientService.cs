using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISMSTypeClientService
    {
        Task<ApiResponse<UpsertSMSTypeResponse>> UpsertSMSTypeAsync(SMSTypeRequest request);
        Task<ApiResponse<SMSTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<SMSTypeModel>>> GetAllSMSTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> UpsertSMSAttachmentFileAsync(SMSTypeAttachmentUpsertRequest req);
        Task<ApiResponse<List<DropdownModel>>> GetSMSTypeDropdownListAsync();
        Task<ApiResponse<List<SMSTypeModel>>> GetAllAsync();
    }
}
