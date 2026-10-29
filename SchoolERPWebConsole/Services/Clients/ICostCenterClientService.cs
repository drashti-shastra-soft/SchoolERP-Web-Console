using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICostCenterClientService
    {
        Task<ApiResponse<SpResult>> UpsertCostCenterAsync(CostCenterModelRequest request);
        Task<ApiResponse<CostCenterModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<CostCenterModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<CostCenterModel>>> GetAllCostCenterWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyCostCenterAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetCostCenterDropdownListAsync(int companyID, int sessionId);
    }
}
