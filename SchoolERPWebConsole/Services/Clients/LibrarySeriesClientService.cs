using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibrarySeriesClientService: BaseApiClient, ILibrarySeriesClientService
    {
        public LibrarySeriesClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibrarySeriesAsync(LibrarySeriesRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySeriesAPI/Save", request);
        }
        public async Task<ApiResponse<LibrarySeriesModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibrarySeriesModel>($"api/LibrarySeriesAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibrarySeriesModel>>> GetAllLibrarySeriesWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibrarySeriesModel>>("api/LibrarySeriesAPI/GetAllLibrarySeriesWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibrarySeriesAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibrarySeriesAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<LibrarySeriesModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibrarySeriesModel>>(
                $"api/LibrarySeriesAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibrarySeriesAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySeriesAPI/CopyLibrarySeries", request);
        }
    }
}
