using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This service handles the actual work of sending requests to the main system to manage currency details in the database via an API.
    /// </summary>
    public class CurrencyClientService : BaseApiClient, ICurrencyClientService
    {
        public CurrencyClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        /// <summary>
        /// Sends a request to the server to get a list of all currencies.
        /// </summary>
        public async Task<ApiResponse<List<MstCurrencyViewModel>>> GetAllAsync(bool includeDeleted = false)
        {
            return await GetAsync<List<MstCurrencyViewModel>>($"api/CurrencyApi/GetAll?includeDeleted={includeDeleted}");
        }

        /// <summary>
        /// Sends a request to the server to look up details for a specific currency by its ID.
        /// </summary>
        public async Task<ApiResponse<MstCurrencyViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<MstCurrencyViewModel>($"api/CurrencyApi/GetByID/{id}");
        }

        /// <summary>
        /// Sends currency details to the server to be saved or updated.
        /// </summary>
        public async Task<ApiResponse<SpResult>> UpsertAsync(MstCurrencyUpsertRequest request)
        {
            return await PostAsync<SpResult>("api/CurrencyApi/Upsert", request);
        }
        
        /// <summary>
        /// Sends a request to the server to delete a currency record.
        /// </summary>
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> id)
        {
            return await PostAsync<dynamic>($"api/CurrencyApi/Delete", id);
        }

        /// <summary>
        /// Sends a request to the server to update whether a currency is currently active.
        /// </summary>
        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CurrencyApi/ToggleStatus", request);
        }

        public async Task<ApiResponse<PagedResult<MstCurrencyViewModel>>> GetAllCurrencyWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<MstCurrencyViewModel>>("api/CurrencyApi/GetAllCurrencyWithPage", request);
        }

        public async Task<ApiResponse<CurrencyDetailsModel>> GetCurrencyByCompanyIdAsync(int companyId)
        {
            return await GetAsync<CurrencyDetailsModel>($"api/CurrencyApi/GetCurrencyByCompanyId?companyId={companyId}");
        }
    }
}
