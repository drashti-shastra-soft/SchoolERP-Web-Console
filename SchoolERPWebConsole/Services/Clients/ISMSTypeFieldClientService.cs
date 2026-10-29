using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ISMSTypeFieldClientService
    {
        Task<ApiResponse<SpResult>> UpsertSMSTypeAsync(SMSFieldRequest request);
        Task<ApiResponse<SMSTypeFieldModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<SMSTypeFieldModel>>> GetAllSMSTypeFieldWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
