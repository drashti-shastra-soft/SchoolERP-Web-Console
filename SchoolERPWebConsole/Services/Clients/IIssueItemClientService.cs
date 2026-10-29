using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IIssueItemClientService
    {
        Task<ApiResponse<SpResult>> UpsertItemIssueAsync(ItemIssueRequest request);
        Task<ApiResponse<ItemIssueModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<ItemIssueModel>>> GetAllItemIssueWithPageAsync(SearchInventoryItemRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<SpResult>> IssueReturnAsync(ItemIssueReturnModel request);
    }
}
