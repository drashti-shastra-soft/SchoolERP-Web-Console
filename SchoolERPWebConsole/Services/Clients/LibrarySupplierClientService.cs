using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibrarySupplierClientService: BaseApiClient, ILibrarySupplierClientService
    {
        public LibrarySupplierClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibrarySupplierAsync(LibrarySupplierRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySupplierAPI/Save", request);
        }
        public async Task<ApiResponse<LibrarySupplierModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibrarySupplierModel>($"api/LibrarySupplierAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibrarySupplierModel>>> GetAllLibrarySupplierWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibrarySupplierModel>>("api/LibrarySupplierAPI/GetAllLibrarySupplierWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibrarySupplierAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibrarySupplierAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<LibrarySupplierModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibrarySupplierModel>>(
                $"api/LibrarySupplierAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibrarySupplierAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySupplierAPI/CopyLibrarySupplier", request);
        }
    }
}
