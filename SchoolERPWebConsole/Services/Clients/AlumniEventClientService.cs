using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class AlumniEventClientService :BaseApiClient, IAlumniEventClientService
    {
        public AlumniEventClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        /// <summary>
        /// Retrieves alumni events.
        /// </summary>
        /// <param name="searchText">Search text.</param>
        /// <returns>List of alumni events.</returns>
        public Task<ApiResponse<List<AlumniEventViewModel>>> GetEventsAsync(
            string? searchText, int companyId)
        {
            return GetAsync<List<AlumniEventViewModel>>(
                $"api/AlumniEventApi/GetEvents?searchText={Uri.EscapeDataString(searchText ?? string.Empty)}&companyId={companyId}");
        }

        /// <summary>
        /// Creates or updates an alumni event.
        /// </summary>
        /// <param name="request">Event details.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<UpsertEventResponse>> UpsertEventAsync(
            AlumniEventUpsertRequest request)
        {
            return PostAsync<UpsertEventResponse>(
                "api/AlumniEventApi/UpsertEvent",
                request);
        }

        /// <summary>
        /// Deletes an alumni event.
        /// </summary>
        /// <param name="eventId">Event identifier.</param>
        /// <returns>Operation result.</returns>
        
        public async Task<ApiResponse<dynamic>> DeleteEventAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/AlumniEventApi/DeleteEvent", ids);
        }
        /// <summary>
        /// Activates or deactivates an alumni event.
        /// </summary>
        /// <param name="eventId">Event identifier.</param>
        /// <param name="isActive">Active status.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<dynamic>> ToggleEventStatusAsync(StatusUpdateRequest request)
        {
            return PostAsync<dynamic>(
                $"api/AlumniEventApi/ToggleEventStatus", request);
        }

        /// <summary>
        /// Retrieves the photo associated with an alumni event.
        /// </summary>
        /// <param name="eventId">Event identifier.</param>
        /// <returns>Photo response.</returns>
        public async Task<HttpResponseMessage> GetEventPhotoAsync(
            int eventId)
        {
            return await _httpClient.GetAsync(
                $"api/AlumniEventApi/GetEventPhoto?eventId={eventId}");
        }

        public async Task<ApiResponse<AlumniEventViewModel>> GetEventsByIdAsync(int id)
        {
            return await GetAsync<AlumniEventViewModel>($"api/AlumniEventApi/GetEventsById?id={id}");
        }

        public async Task<ApiResponse<PagedResult<AlumniEventViewModel>>> GetAllEventsWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<AlumniEventViewModel>>("api/AlumniEventApi/GetAllEventsWithPage", request);
        }

        public Task<ApiResponse<dynamic>> AlumniEventAttachmentFileAsync(AlumniEventAttachmentUpsertRequest req)
            => PostAsync<dynamic>("api/AlumniEventApi/AlumniEventAttachmentFile", req);
    }
}
