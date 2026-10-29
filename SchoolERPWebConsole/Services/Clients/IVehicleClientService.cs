using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IVehicleClientService
    {
        Task<ApiResponse<List<VehicleViewModel>>> GetAllVehiclesAsync(int companyId, int sessionId);
        Task<ApiResponse<VehicleViewModel>> GetVehicleByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertVehicleAsync(VehicleFormModel form);
        Task<ApiResponse<dynamic>> DeleteVehicleAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleVehicleStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
