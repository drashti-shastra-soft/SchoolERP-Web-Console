using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IPickupPointClientService
    {
        Task<ApiResponse<List<PickupPointViewModel>>> GetAllPickupPointsAsync(int companyId, int sessionId);
        Task<ApiResponse<PickupPointViewModel>> GetPickupPointByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertPickupPointAsync(PickupPointUpsertRequest req);
        Task<ApiResponse<dynamic>> DeletePickupPointAsync(List<int> id);
        //Task<ApiResponse<dynamic>> TogglePickupPointStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
