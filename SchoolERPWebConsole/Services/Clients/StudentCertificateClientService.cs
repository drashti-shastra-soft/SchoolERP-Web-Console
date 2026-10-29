using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class StudentCertificateClientService : BaseApiClient, IStudentCertificateClientService
    {
        public StudentCertificateClientService(HttpClient httpClient, IConfiguration configuration) : base(httpClient)
        {
        }

        public async Task<ApiResponse<List<StudentCertificateViewModel>>> GetAll(int companyId, int sessionId)
        {
            return await GetAsync<List<StudentCertificateViewModel>>($"api/StudentCertificateApi/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<StudentCertificateViewModel>> GetByID(int id)
        {
            return await GetAsync<StudentCertificateViewModel>($"api/StudentCertificateApi/GetByID/{id}");
        }

        public async Task<ApiResponse<int>> Upsert(StudentCertificateUpsertRequest request)
            {
            return await PostAsync<int>("api/StudentCertificateApi/Upsert", request);
        }

        public async Task<ApiResponse<int>> Delete(List<int> id)
        {
            return await PostAsync<int>($"api/StudentCertificateApi/Delete", id);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/StudentCertificateApi/ToggleStatus", request);
        }

        public async Task<ApiResponse<string>> Generate(int studentId, int certificateId)
        {
            return await GetAsync<string>($"api/StudentCertificateApi/Generate?studentId={studentId}&certificateId={certificateId}");
        }
    }
}
