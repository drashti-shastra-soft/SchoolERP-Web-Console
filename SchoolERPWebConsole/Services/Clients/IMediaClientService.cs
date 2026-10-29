using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IMediaClientService
    {
        Task<ApiResponse<dynamic>> UpsertAsync(MediaRequest request);
        Task<ApiResponse<PagedResult<MediaViewModel>>> GetAllMediaWithPageAsync(SearchRequest request);
    }
}
