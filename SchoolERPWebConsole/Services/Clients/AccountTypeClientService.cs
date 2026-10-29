using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class AccountTypeClientService:BaseApiClient, IAccountTypeClientService
    {
        public AccountTypeClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertAccountTypeAsync(AccountTypeModelRequest request)
        {
            return await PostAsync<SpResult>("api/AccountTypeAPI/Save", request);
        }
        public async Task<ApiResponse<SpResult>> UpsertAccountAddSystemTypeAsync(AccountTypeModelRequest request)
        {
            return await PostAsync<SpResult>("api/AccountTypeAPI/UpsertAccountAddSystemType", request);
        }
        public async Task<ApiResponse<AccountTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<AccountTypeModel>($"api/AccountTypeAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<AccountTypeModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<AccountTypeModel>>($"api/AccountTypeAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<AccountTypeModel>>> GetAllAccountTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<AccountTypeModel>>("api/AccountTypeAPI/GetAllAccountTypeWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/AccountTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/AccountTypeAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyAccountTypeAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/AccountTypeAPI/CopyAccountType", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetClosesToDropdownListAsync(int? companyId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/AccountTypeAPI/GetClosesToDropdownList?companyId={companyId}");
        }
    }
}
