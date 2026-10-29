using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SubjectTypeClientService : BaseApiClient, ISubjectTypeClientService
    {
        public SubjectTypeClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<SubjectTypeModel>>> GetAllSubjectTypeWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<SubjectTypeModel>>("api/SubjectTypeAPI/GetAllSubjectTypeWithPage", request);
        }

        public async Task<ApiResponse<SubjectTypeModel>> GetByIDAsync(int id)
        {
            return await GetAsync<SubjectTypeModel>($"api/SubjectTypeAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(SubjectTypeRequest request)
        {
            return await PostAsync<dynamic>("api/SubjectTypeAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SubjectTypeAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SubjectTypeAPI/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<SubjectTypeModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<SubjectTypeModel>>($"api/SubjectTypeAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<dynamic>> CopySubjectTypeAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/SubjectTypeAPI/CopySubjectType", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetSubjectsTypeDropdownListAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/SubjectTypeAPI/GetSubjectsTypeDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
    }
}
