using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IRouteClientService
    {
        Task<ApiResponse<List<RouteViewModel>>> GetAllRoutesAsync(int companyId, int sessionId);
        Task<ApiResponse<RouteViewModel>> GetRouteByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertRouteAsync(RouteUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteRouteAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleRouteStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
