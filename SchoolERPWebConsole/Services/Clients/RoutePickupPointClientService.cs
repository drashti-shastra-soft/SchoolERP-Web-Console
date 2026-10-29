using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class RoutePickupPointClientService : BaseApiClient, IRoutePickupPointClientService
    {
        public RoutePickupPointClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<RoutePickupPointViewModel>>> GetAllRoutePickupPointsAsync(int companyId, int sessionId)
           => GetAsync<List<RoutePickupPointViewModel>>($"api/RoutePickupPointsApi/GetAllRoutePickupPoints?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<RoutePickupPointViewModel>> GetRoutePickupPointByIDAsync(int id)
            => GetAsync<RoutePickupPointViewModel>($"api/RoutePickupPointsApi/GetRoutePickupPointByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertRoutePickupPointAsync(RoutePickupPointUpsertRequest req)
            => PostAsync<dynamic>("api/RoutePickupPointsApi/UpsertRoutePickupPoint", req);

        public Task<ApiResponse<dynamic>> DeleteRoutePickupPointAsync(List<int> id)
            => PostAsync<dynamic>($"api/RoutePickupPointsApi/DeleteRoutePickupPoint", id);

        //public Task<ApiResponse<dynamic>> ToggleRoutePickupPointStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/RoutePickupPointsApi/ToggleRoutePickupPointStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/RoutePickupPointsApi/ToggleStatus", request);
        }
    }
}
