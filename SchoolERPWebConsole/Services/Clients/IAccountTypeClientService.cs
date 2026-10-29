using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IAccountTypeClientService
    {
        Task<ApiResponse<SpResult>> UpsertAccountTypeAsync(AccountTypeModelRequest request);
        Task<ApiResponse<SpResult>> UpsertAccountAddSystemTypeAsync(AccountTypeModelRequest request);
        Task<ApiResponse<AccountTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<List<AccountTypeModel>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<AccountTypeModel>>> GetAllAccountTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> CopyAccountTypeAsync(CopyRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetClosesToDropdownListAsync(int? companyId = null);
    }
}
