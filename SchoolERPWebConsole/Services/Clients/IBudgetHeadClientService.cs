using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IBudgetHeadClientService
    {
        Task<ApiResponse<SpResult>> UpsertBudgetHeadAsync(BudgetHeadModelRequest request);
        Task<ApiResponse<BudgetHeadModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<BudgetHeadModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<BudgetHeadModel>>> GetAllBudgetHeadWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyBudgetHeadAsync(CopyRequest request);
    }
}
