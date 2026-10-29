using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IAlumniEventClientService
    {
        /// <summary>
        /// Retrieves alumni events.
        /// </summary>
        /// <param name="searchText">Search text.</param>
        /// <returns>List of alumni events.</returns>
        Task<ApiResponse<List<AlumniEventViewModel>>> GetEventsAsync(
            string? searchText, int companyId);

        Task<ApiResponse<UpsertEventResponse>> UpsertEventAsync(
            AlumniEventUpsertRequest request);
        Task<ApiResponse<dynamic>> DeleteEventAsync(List<int> ids);


        Task<ApiResponse<dynamic>> ToggleEventStatusAsync(StatusUpdateRequest request);
        Task<HttpResponseMessage> GetEventPhotoAsync(
            int eventId);
        Task<ApiResponse<AlumniEventViewModel>> GetEventsByIdAsync(int id);
        Task<ApiResponse<PagedResult<AlumniEventViewModel>>> GetAllEventsWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> AlumniEventAttachmentFileAsync(AlumniEventAttachmentUpsertRequest req);
    }
}
