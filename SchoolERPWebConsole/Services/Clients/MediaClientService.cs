using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class MediaClientService : BaseApiClient, IMediaClientService
    {
        public MediaClientService(HttpClient httpClient) : base(httpClient)
        {
        }
        public async Task<ApiResponse<dynamic>> UpsertAsync(MediaRequest request)
        {
            return await PostAsync<dynamic>("api/MediaAPI/Upsert", request);
        }

        public async Task<ApiResponse<PagedResult<MediaViewModel>>> GetAllMediaWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<MediaViewModel>>("api/MediaAPI/GetAllMediaWithPage", request);
        }
    }
}
