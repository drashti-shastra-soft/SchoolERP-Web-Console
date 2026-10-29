using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IAccountEntryClientService
    {
        Task<ApiResponse<List<AccountEntryViewModel>>> GetAllAccountEntriesAsync(string entryType, bool includeDeleted = false);
        Task<ApiResponse<PagedResult<AccountEntryViewModel>>> SearchAccountEntriesAsync(AccountEntrySearchRequest req);
        Task<ApiResponse<AccountHeadModel>> GetAccountEntryByIDAsync(int id);
        Task<ApiResponse<UpsertExpenseResponse>> UpsertAccountEntryAsync(AccountEntryUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteAccountEntryAsync(List<int> id);
        Task<ApiResponse<dynamic>> ToggleAccountEntryStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<PagedResult<AccountEntryViewModel>>> GetAllAccountEntriesdWithPageIndexAsync(AccountHeadSearchRequest request);
        Task<ApiResponse<dynamic>> UpsertAccountEntryAttachmentFileAsync(AccountEntryAttachmentUpsertRequest req);
    }
}
