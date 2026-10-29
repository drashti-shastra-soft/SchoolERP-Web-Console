using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class AccountHeadClientService : BaseApiClient, IAccountHeadClientService
    {
        public AccountHeadClientService(HttpClient httpClient)
            : base(httpClient) { }

        public Task<ApiResponse<List<AccountHeadViewModel>>> GetAllAccountHeadsAsync(string headType, bool includeDeleted = false, int? companyId = null, int? sessionId = null)
            => GetAsync<List<AccountHeadViewModel>>($"api/AccountHeadApi/GetAllAccountHeads?headType={headType}&includeDeleted={includeDeleted}&companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<AccountHeadModel>> GetAccountHeadByIDAsync(int id)
            => GetAsync<AccountHeadModel>($"api/AccountHeadApi/GetAccountHeadByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertAccountHeadAsync(AccountHeadUpsertRequest req)
            => PostAsync<dynamic>("api/AccountHeadApi/UpsertAccountHead", req);

        public Task<ApiResponse<dynamic>> DeleteAccountHeadAsync(List<int> id)
            => PostAsync<dynamic>($"api/AccountHeadApi/DeleteAccountHead", id);

        public Task<ApiResponse<dynamic>> ToggleAccountHeadStatusAsync(StatusUpdateRequest request)
            => PostAsync<dynamic>($"api/AccountHeadApi/ToggleAccountHeadStatus", request!);


        public async Task<ApiResponse<PagedResult<AccountHeadViewModel>>> GetAllAccountHeadWithPageIndexAsync(AccountHeadSearchRequest request)
        {
            return await PostAsync<PagedResult<AccountHeadViewModel>>("api/AccountHeadApi/GetAllAccountHeadWithPageIndex", request);
        }

        public async Task<ApiResponse<SpResult>> CopyAccountHeadAsync(CopyRequest request)
        {
            return await PostAsync<SpResult>("api/AccountHeadApi/CopyAccountHead", request);
        }

        public async Task<ApiResponse<UpsertAccountResponse>> UpsertAccountHeadAsync(AccountRequest request)
        {
            return await PostAsync<UpsertAccountResponse>("api/AccountHeadApi/UpsertAccountHead", request);
        }
        public Task<ApiResponse<List<DropdownModel>>> GetAccountParentDropdownListAsync(int? excludeAccountID = null, int? companyId = null, int? sessionId = null)
           => GetAsync<List<DropdownModel>>($"api/AccountHeadApi/GetAccountParentDropdownList?excludeAccountID={excludeAccountID}&companyId={companyId}&sessionId={sessionId}");
        
        public async Task<ApiResponse<PagedResult<AccountHeadModel>>> GetAllListAccountHeadWithPageIndexAsync(SearchAccountHeadRequest request)
        {
            return await PostAsync<PagedResult<AccountHeadModel>>("api/AccountHeadApi/GetAllListAccountHeadWithPageIndex", request);
        }
        public Task<ApiResponse<dynamic>> UpsertAccountHeadAttachmentFileAsync(AccountEntryAttachmentUpsertRequest req)
            => PostAsync<dynamic>("api/AccountHeadApi/UpsertAccountHeadAttachmentFile", req);
    }
}
