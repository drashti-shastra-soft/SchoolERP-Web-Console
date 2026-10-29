using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibraryCategoryClientService: BaseApiClient, ILibraryCategoryClientService
    {
        public LibraryCategoryClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibraryCategoryAsync(LibraryCategoryRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryCategoryAPI/Save", request);
        }
        public async Task<ApiResponse<LibraryCategoryModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibraryCategoryModel>($"api/LibraryCategoryAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibraryCategoryModel>>> GetAllLibraryCategoryWithPagePageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryCategoryModel>>("api/LibraryCategoryAPI/GetAllLibraryCategoryWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibraryCategoryAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibraryCategoryAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<LibraryCategoryModel>>> GetAllAsync(
           int companyId,
           bool? includdeleted)
        {
            return await GetAsync<List<LibraryCategoryModel>>(
                $"api/LibraryCategoryAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryCategoryAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryCategoryAPI/CopyLibraryCategory", request);
        }
    }
}
