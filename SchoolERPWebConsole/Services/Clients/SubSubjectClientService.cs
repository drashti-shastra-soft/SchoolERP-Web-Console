using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class SubSubjectClientService : BaseApiClient, ISubSubjectClientService
    {
        public SubSubjectClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<SubSubjectViewModel>>> GetAllSubSubjectWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<SubSubjectViewModel>>("api/SubSubjectAPI/GetAllSubSubjectWithPage", request);
        }

        public async Task<ApiResponse<SubSubjectViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<SubSubjectViewModel>($"api/SubSubjectAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(SubSubjectRequest request)
        {
            return await PostAsync<dynamic>("api/SubSubjectAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SubSubjectAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SubSubjectAPI/ToggleStatus", request);
        }        

        public async Task<ApiResponse<List<DropdownModel>>> GetSubSubjectBindDropdownListAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<DropdownModel>>($"api/SubSubjectAPI/GetSubSubjectBindDropdownList?companyId={companyId}&sessionId={sessionId}");
        }
    }
}
