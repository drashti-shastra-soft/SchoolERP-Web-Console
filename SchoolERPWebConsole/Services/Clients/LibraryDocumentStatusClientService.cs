using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibraryDocumentStatusClientService : BaseApiClient, ILibraryDocumentStatusClientService
    {
        public LibraryDocumentStatusClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibraryDocumentStatusAsync(LibraryDocumentStatusRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryDocumentStatusAPI/Save", request);
        }
        public async Task<ApiResponse<LibraryDocumentStatusModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibraryDocumentStatusModel>($"api/LibraryDocumentStatusAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibraryDocumentStatusModel>>> GetAllDocumentStatusWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryDocumentStatusModel>>("api/LibraryDocumentStatusAPI/GetAllDocumentStatusWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibraryDocumentStatusAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibraryDocumentStatusAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<List<LibraryDocumentStatusModel>>> GetAllAsync(int companyId)
        {
            return await GetAsync<List<LibraryDocumentStatusModel>>($"api/LibraryDocumentStatusAPI/GetAll?companyId={companyId}");
        }

        public async Task<ApiResponse<List<LibraryLanguageModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibraryLanguageModel>>(
                $"api/LibraryDocumentStatusAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyDocumentStatusAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryDocumentStatusAPI/CopyDocumentStatus", request);
        }
    }
}
