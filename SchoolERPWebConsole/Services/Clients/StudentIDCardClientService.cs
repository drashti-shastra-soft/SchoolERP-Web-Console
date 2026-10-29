using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class StudentIDCardClientService : BaseApiClient, IStudentIDCardClientService
    {
        public StudentIDCardClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<List<StudentIDCardViewModel>>> GetAll(int companyId, int sessionId)
        {
            return await GetAsync<List<StudentIDCardViewModel>>($"api/StudentIDCardApi/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<StudentIDCardViewModel>> GetByID(int id)
        {
            return await GetAsync<StudentIDCardViewModel>($"api/StudentIDCardApi/GetByID/{id}");
        }

        public async Task<ApiResponse<int>> Upsert(StudentIDCardUpsertRequest request)
        {
            return await PostAsync<int>("api/StudentIDCardApi/Upsert", request);
        }

        public async Task<ApiResponse<int>> Delete(List<int> id)
        {
            return await PostAsync<int>($"api/StudentIDCardApi/Delete", id);
        }


        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/StudentIDCardApi/ToggleStatus", request);
        }
    }
}
