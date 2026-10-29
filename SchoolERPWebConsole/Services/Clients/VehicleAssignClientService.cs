using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class VehicleAssignClientService : BaseApiClient, IVehicleAssignClientService
    {
        public VehicleAssignClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<VehicleAssignViewModel>>> GetAllAssignmentsAsync(int companyId, int sessionId)
            => GetAsync<List<VehicleAssignViewModel>>($"api/VehicleAssignApi/GetAllAssignments?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<VehicleAssignViewModel>> GetAssignmentByIDAsync(int id)
            => GetAsync<VehicleAssignViewModel>($"api/VehicleAssignApi/GetAssignmentByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertAssignmentsAsync(VehicleAssignUpsertRequest req)
            => PostAsync<dynamic>("api/VehicleAssignApi/UpsertAssignments", req);

        public Task<ApiResponse<dynamic>> DeleteAssignmentAsync(List<int> id)
            => PostAsync<dynamic>($"api/VehicleAssignApi/DeleteAssignment", id);

        //public Task<ApiResponse<dynamic>> ToggleAssignmentStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/VehicleAssignApi/ToggleAssignmentStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VehicleAssignApi/ToggleStatus", request);
        }

        public Task<ApiResponse<StudentTransportDetailsModel>> GetTransportDetailsByStudentsAsync(int companyId,
            int sessionId, int studentId)
           => GetAsync<StudentTransportDetailsModel>($"api/VehicleAssignApi/GetTransportDetailsByStudents?companyId={companyId}&sessionId={sessionId}&studentId={studentId}");
    }
}
