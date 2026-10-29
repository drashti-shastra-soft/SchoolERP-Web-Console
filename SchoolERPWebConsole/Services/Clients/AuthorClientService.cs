using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class AuthorClientService: BaseApiClient,IAuthorClientService
    {
        public AuthorClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertAuthorAsync(AuthorRequest request)
        {
            return await PostAsync<SpResult>("api/AuthorAPI/Save", request);
        }
        public async Task<ApiResponse<AuthorModel>> GetByIDAsync(int id)
        {
            return await GetAsync<AuthorModel>($"api/AuthorAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<AuthorModel>>> GetAllAuthorWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<AuthorModel>>("api/AuthorAPI/GetAllAuthorWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/AuthorAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/AuthorAPI/ToggleStatus", request);
        }

        /// <summary>
        /// Retrieves the list of publisher for the specified company.
        /// This method calls the Library API and returns all matching publisher.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="includdeleted">Optional includdeleted.</param>
        /// <returns>A collection of publisher.</returns>
        public async Task<ApiResponse<List<AuthorModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<AuthorModel>>(
                $"api/AuthorAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library author via the API.
        /// </summary>
        /// <param name="request">The library author request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryAuthorAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/AuthorAPI/CopyLibraryAuthor", request);
        }
    }
}
