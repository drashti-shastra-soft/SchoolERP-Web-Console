using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IStudentCertificateClientService
    {
        Task<ApiResponse<List<StudentCertificateViewModel>>> GetAll(int companyId, int sessionId);
        Task<ApiResponse<StudentCertificateViewModel>> GetByID(int id);
        Task<ApiResponse<int>> Upsert(StudentCertificateUpsertRequest request);
        Task<ApiResponse<int>> Delete(List<int> id);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<string>> Generate(int studentId, int certificateId);
    }
}
