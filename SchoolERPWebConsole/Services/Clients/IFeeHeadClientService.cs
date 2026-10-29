using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeHeadClientService
    {
        Task<ApiResponse<SpResult>> UpsertFeeCategoryAsync(FeeHeadRequest request);
        Task<ApiResponse<FeeHeadViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<FeeHeadViewModel>>> GetAllFeeHeadWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetFeeHeadDropdownListAsync(int? companyId = null, int? sessionID = null);
    }
}
