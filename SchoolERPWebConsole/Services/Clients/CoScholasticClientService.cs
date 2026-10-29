using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CoScholasticClientService : BaseApiClient, ICoScholasticClientService
    {
        public CoScholasticClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<CoScholasticViewModel>>> GetAllCoScholasticWithPageAsync(CoScholasticSearchRequest request)
        {
            return await PostAsync<PagedResult<CoScholasticViewModel>>("api/CoScholasticAPI/GetAllCoScholasticWithPage", request);
        }

        public async Task<ApiResponse<CoScholasticViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<CoScholasticViewModel>($"api/CoScholasticAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(CoScholasticRequest request)
        {
            return await PostAsync<dynamic>("api/CoScholasticAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/CoScholasticAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CoScholasticAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<CoScholasticViewModel>>> GetAllAsync(int? companyId = null, bool? isActive = null)
        {
            return await GetAsync<List<CoScholasticViewModel>>($"api/CoScholasticAPI/GetAll?companyId={companyId}&isActive={isActive}");
        }

        public async Task<ApiResponse<List<ClassCoScholasticTreeItemViewModel>>> GetClassTreeAsync(int? companyId = null, int? sessionId = null, int? classId = null)
        {
            return await GetAsync<List<ClassCoScholasticTreeItemViewModel>>($"api/ClassCoScholasticAPI/GetClassTree?companyId={companyId}&sessionId={sessionId}&classId={classId}");
        }

        public async Task<ApiResponse<dynamic>> UpsertClassCoScholasticAsync(ClassCoScholasticSaveRequest request)
        {
            return await PostAsync<dynamic>("api/ClassCoScholasticAPI/UpsertClassCoScholastic", request);
        }
        public async Task<ApiResponse<List<DropdownModel>>> GetClassCoScholasticListAsync(int? companyId = null, int? sessionId = null, int? classId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/ClassCoScholasticAPI/GetClassCoScholasticList?companyId={companyId}&sessionId={sessionId}&classId={classId}");
        }

    }
}
