using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IStudentIDCardClientService
    {
        Task<ApiResponse<List<StudentIDCardViewModel>>> GetAll(int companyId, int sessionId);
        Task<ApiResponse<StudentIDCardViewModel>> GetByID(int id);
        Task<ApiResponse<int>> Upsert(StudentIDCardUpsertRequest request);
        Task<ApiResponse<int>> Delete(List<int> id);
        //Task<ApiResponse<int>> ToggleStatus(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
