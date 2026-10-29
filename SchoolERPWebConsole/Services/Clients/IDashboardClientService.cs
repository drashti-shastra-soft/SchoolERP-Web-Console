using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IDashboardClientService
    {
        Task<ApiResponse<List<DashboardModel>>> GetAllAsync();
        Task<ApiResponse<DashboardModel?>> GetByIdAsync(int dashboardId);
        Task<ApiResponse<object>> SaveAsync(DashboardRequestModel request);
        Task<ApiResponse<object>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<object>> DeleteMultipleAsync(List<int> id);
        Task<ApiResponse<DashboardModel?>> GetByRoleIdAsync(int roleId);
    }
}
