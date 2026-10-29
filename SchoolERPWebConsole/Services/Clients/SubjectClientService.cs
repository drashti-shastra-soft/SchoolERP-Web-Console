using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class SubjectClientService : BaseApiClient, ISubjectClientService
    {
        public SubjectClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        //public async Task<ApiResponse<List<MstSubjectViewModel>>> GetAllAsync(SubjectSearchRequest request)
        //{
        //    return await GetAsync<List<MstSubjectViewModel>>($"api/SubjectApi/GetAll?includeDeleted={includeDeleted}&sessionId={sessionId}");
        //}

        public async Task<ApiResponse<PagedResult<MstSubjectViewModel>>> GetAllAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<MstSubjectViewModel>>("api/SubjectApi/GetAll", request);
        }

        //public async Task<ApiResponse<PagedResult<MstSubjectViewModel>>> GetSubjectListForDashboardAsync(SubjectSearchRequest request)
        //{
        //    return await PostAsync<PagedResult<MstSubjectViewModel>>("api/SubjectApi/GetSubjectListForDashboard", request);
        //}

        public async Task<ApiResponse<PagedResult<MstSubjectViewModel>>> GetSubjectListForDashboardAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<MstSubjectViewModel>>("api/SubjectApi/GetAll", request);
        }

        public async Task<ApiResponse<MstSubjectViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<MstSubjectViewModel>($"api/SubjectApi/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(MstSubjectUpsertRequest request)
        {
            return await PostAsync<dynamic>("api/SubjectApi/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SubjectApi/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SubjectApi/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<Dropdowbinding>>> SubjectsDropdowBindAsync(DropdowRequest request)
        {
            return await PostAsync<List<Dropdowbinding>>("api/SubjectApi/SubjectsDropdowBind", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetSubjectGropBySubjectDropdownList(int subjectGroupId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/SubjectApi/GetSubjectGropBySubjectDropdownList?subjectGroupId={subjectGroupId}");
        }
    }
}
