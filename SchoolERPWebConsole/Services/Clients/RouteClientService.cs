using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class RouteClientService : BaseApiClient, IRouteClientService
    {
        public RouteClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<RouteViewModel>>> GetAllRoutesAsync(int companyId, int sessionId)
            => GetAsync<List<RouteViewModel>>($"api/RoutesApi/GetAllRoutes?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<RouteViewModel>> GetRouteByIDAsync(int id)
            => GetAsync<RouteViewModel>($"api/RoutesApi/GetRouteByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertRouteAsync(RouteUpsertRequest req)
            => PostAsync<dynamic>("api/RoutesApi/UpsertRoute", req);

        public Task<ApiResponse<dynamic>> DeleteRouteAsync(List<int> id)
            => PostAsync<dynamic>($"api/RoutesApi/DeleteRoute", id);

        //public Task<ApiResponse<dynamic>> ToggleRouteStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/RoutesApi/ToggleRouteStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/RoutesApi/ToggleStatus", request);
        }
    }
}
