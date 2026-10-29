using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class PublisherClientService: BaseApiClient,IPublisherClientService
    {
        public PublisherClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<SpResult>> UpsertPublisherAsync(PublisherRequest request)
        {
            return await PostAsync<SpResult>("api/PublisherAPI/Save", request);
        }
        public async Task<ApiResponse<PublisherModel>> GetByIDAsync(int id)
        {
            return await GetAsync<PublisherModel>($"api/PublisherAPI/GetById/{id}");
        }
        public async Task<ApiResponse<PagedResult<PublisherModel>>> GetAllPublishertWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<PublisherModel>>("api/PublisherAPI/GetAllPublishertWithPage", request);
        }
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/PublisherAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/PublisherAPI/ToggleStatus", request);
        }

        /// <summary>
        /// Retrieves the list of publisher for the specified company.
        /// This method calls the Library API and returns all matching publisher.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="includdeleted">Optional includdeleted.</param>
        /// <returns>A collection of publisher.</returns>
        public async Task<ApiResponse<List<PublisherModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<PublisherModel>>(
                $"api/PublisherAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library publisher via the API.
        /// </summary>
        /// <param name="request">The library publisher request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryPublisherAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/PublisherAPI/CopyLibraryPublisher", request);
        }
    }
}
