using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IPublisherClientService
    {
        Task<ApiResponse<SpResult>> UpsertPublisherAsync(PublisherRequest request);
        Task<ApiResponse<PublisherModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<PublisherModel>>> GetAllPublishertWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<PublisherModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);
        Task<ApiResponse<SpResult>> CopyLibraryPublisherAsync(CopyForCompanyRequest request);
    }
}
