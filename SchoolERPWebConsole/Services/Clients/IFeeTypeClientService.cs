using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeTypeClientService
    {
        Task<ApiResponse<SpResult>> UpsertFeeTypeAsync(FeeTypeRequest request);
        Task<ApiResponse<FeeTypeViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<FeeTypeViewModel>>> GetAllFeeTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetFeeTypeDropdownListAsync(int? companyId = null, int? sessionID = null);
    }
}
