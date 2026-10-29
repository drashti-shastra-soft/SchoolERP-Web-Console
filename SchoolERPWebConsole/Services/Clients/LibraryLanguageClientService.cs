using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibraryLanguageClientService : BaseApiClient, ILibraryLanguageClientService
    {
        public LibraryLanguageClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertPublisherAsync(LibraryLanguageRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryLanguageAPI/Save", request);
        }
        public async Task<ApiResponse<LibraryLanguageModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibraryLanguageModel>($"api/LibraryLanguageAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibraryLanguageModel>>> GetAllLibraryLanguageWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryLanguageModel>>("api/LibraryLanguageAPI/GetAllLibraryLanguageWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibraryLanguageAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibraryLanguageAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<LibraryLanguageModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibraryLanguageModel>>(
                $"api/LibraryLanguageAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryLanguageAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryLanguageAPI/CopyLibraryLanguage", request);
        }
    }
}
