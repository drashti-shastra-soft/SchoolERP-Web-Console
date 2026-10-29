using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibraryDocumentTypeClientService:BaseApiClient, ILibraryDocumentTypeClientService
    {
        public LibraryDocumentTypeClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibraryDocumentTypeAsync(LibraryDocumentTypeRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryDocumentTypeAPI/Save", request);
        }
        public async Task<ApiResponse<LibraryDocumentTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibraryDocumentTypeModel>($"api/LibraryDocumentTypeAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibraryDocumentTypeModel>>> GetAllLibraryDocumentTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryDocumentTypeModel>>("api/LibraryDocumentTypeAPI/GetAllLibraryDocumentTypeWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibraryDocumentTypeAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibraryDocumentTypeAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<LibraryDocumentTypeModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibraryDocumentTypeModel>>(
                $"api/LibraryDocumentTypeAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryDocumentTypeAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryDocumentTypeAPI/CopyLibraryDocumentType", request);
        }
    }
}
