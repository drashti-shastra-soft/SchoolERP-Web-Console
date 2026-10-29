using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class AccountEntryClientService : BaseApiClient, IAccountEntryClientService
    {
        public AccountEntryClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<AccountEntryViewModel>>> GetAllAccountEntriesAsync(string entryType, bool includeDeleted = false)
            => GetAsync<List<AccountEntryViewModel>>($"api/AccountEntryApi/GetAllAccountEntries?entryType={entryType}&includeDeleted={includeDeleted}");
        
        public Task<ApiResponse<PagedResult<AccountEntryViewModel>>> SearchAccountEntriesAsync(AccountEntrySearchRequest req)
            => PostAsync<PagedResult<AccountEntryViewModel>>("api/AccountEntryApi/SearchAccountEntries", req);

        public Task<ApiResponse<AccountHeadModel>> GetAccountEntryByIDAsync(int id)
            => GetAsync<AccountHeadModel>($"api/AccountEntryApi/GetAccountEntryByID/{id}");

        public Task<ApiResponse<UpsertExpenseResponse>> UpsertAccountEntryAsync(AccountEntryUpsertRequest req)
            =>  PostAsync<UpsertExpenseResponse>("api/AccountEntryApi/UpsertAccountEntry", req);

        public Task<ApiResponse<dynamic>> UpsertAccountEntryAttachmentFileAsync(AccountEntryAttachmentUpsertRequest req)
            => PostAsync<dynamic>("api/AccountEntryApi/UpsertAccountEntryAttachmentFile", req);


        public Task<ApiResponse<dynamic>> DeleteAccountEntryAsync(List<int> id)
            => PostAsync<dynamic>($"api/AccountEntryApi/DeleteAccountEntry", id);

        public Task<ApiResponse<dynamic>> ToggleAccountEntryStatusAsync(StatusUpdateRequest request)
            => PostAsync<dynamic>($"api/AccountEntryApi/ToggleAccountEntryStatus", request);

        public async Task<ApiResponse<PagedResult<AccountEntryViewModel>>> GetAllAccountEntriesdWithPageIndexAsync(AccountHeadSearchRequest request)
        {
            return await PostAsync<PagedResult<AccountEntryViewModel>>("api/AccountEntryApi/GetAllAccountEntriesdWithPageIndex", request);
        }
    }
}
