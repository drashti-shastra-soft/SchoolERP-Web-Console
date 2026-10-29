using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IRoutePickupPointClientService
    {
        Task<ApiResponse<List<RoutePickupPointViewModel>>> GetAllRoutePickupPointsAsync(int companyId, int sessionId);
        Task<ApiResponse<RoutePickupPointViewModel>> GetRoutePickupPointByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertRoutePickupPointAsync(RoutePickupPointUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteRoutePickupPointAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleRoutePickupPointStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
