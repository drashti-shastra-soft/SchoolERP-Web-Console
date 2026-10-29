using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class ClassSubSubjectClientService : BaseApiClient, IClassSubSubjectClientService
    {
        public ClassSubSubjectClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<PagedResult<ClassSubSubjectViewModel>>> GetAllClassSubSubjectWithPageAsync(SubjectSearchRequest request)
        {
            return await PostAsync<PagedResult<ClassSubSubjectViewModel>>("api/ClassSubSubjectAPI/GetAllClassSubSubjectWithPage", request);
        }

        public async Task<ApiResponse<ClassSubSubjectViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<ClassSubSubjectViewModel>($"api/ClassSubSubjectAPI/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(ClassSubSubjectRequest request)
        {
            return await PostAsync<dynamic>("api/ClassSubSubjectAPI/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids)
        {
            return await PostAsync<dynamic>($"api/ClassSubSubjectAPI/Delete/", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/ClassSubSubjectAPI/ToggleStatus", request);
        }

    }
}
