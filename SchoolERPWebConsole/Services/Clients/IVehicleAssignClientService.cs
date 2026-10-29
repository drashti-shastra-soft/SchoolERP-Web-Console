using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IVehicleAssignClientService
    {
        Task<ApiResponse<List<VehicleAssignViewModel>>> GetAllAssignmentsAsync(int companyId, int sessionId);
        Task<ApiResponse<VehicleAssignViewModel>> GetAssignmentByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAssignmentsAsync(VehicleAssignUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteAssignmentAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleAssignmentStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<StudentTransportDetailsModel>> GetTransportDetailsByStudentsAsync(int companyId,
            int sessionId, int studentId);
    }
}
