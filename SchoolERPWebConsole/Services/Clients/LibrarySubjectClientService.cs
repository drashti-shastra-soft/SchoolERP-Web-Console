using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibrarySubjectClientService : BaseApiClient, ILibrarySubjectClientService
    {
        public LibrarySubjectClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertLibrarySubjectAsync(LibrarySubjectRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySubjectAPI/Save", request);
        }
        public async Task<ApiResponse<LibrarySubjectModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibrarySubjectModel>($"api/LibrarySubjectAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<LibrarySubjectModel>>> GetAllLibrarySubjectWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibrarySubjectModel>>("api/LibrarySubjectAPI/GetAllLibrarySubjectWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibrarySubjectAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibrarySubjectAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<List<LibrarySubjectModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibrarySubjectModel>>(
                $"api/LibrarySubjectAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibrarySubjectAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibrarySubjectAPI/CopyLibrarySubject", request);
        }
    }
}
