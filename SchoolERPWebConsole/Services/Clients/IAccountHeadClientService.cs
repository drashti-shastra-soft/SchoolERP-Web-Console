using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IAccountHeadClientService
    {
        Task<ApiResponse<List<AccountHeadViewModel>>> GetAllAccountHeadsAsync(string headType, bool includeDeleted = false, int? companyId = null, int? sessionId = null);
        Task<ApiResponse<AccountHeadModel>> GetAccountHeadByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAccountHeadAsync(AccountHeadUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteAccountHeadAsync(List<int> id);
        Task<ApiResponse<dynamic>> ToggleAccountHeadStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<PagedResult<AccountHeadViewModel>>> GetAllAccountHeadWithPageIndexAsync(AccountHeadSearchRequest request);

        Task<ApiResponse<SpResult>> CopyAccountHeadAsync(CopyRequest request);
        Task<ApiResponse<UpsertAccountResponse>> UpsertAccountHeadAsync(AccountRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetAccountParentDropdownListAsync(int? excludeAccountID = null, int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<AccountHeadModel>>> GetAllListAccountHeadWithPageIndexAsync(SearchAccountHeadRequest request);
        Task<ApiResponse<dynamic>> UpsertAccountHeadAttachmentFileAsync(AccountEntryAttachmentUpsertRequest req);
    }
}
