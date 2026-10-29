using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class SubjectGroupClientService : BaseApiClient, ISubjectGroupClientService
    {
        public SubjectGroupClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        public async Task<ApiResponse<List<MstSubjectGroupViewModel>>> GetAllAsync(bool includeDeleted = false,int? sessionId = null, int? companyId = null)
        {
            return await GetAsync<List<MstSubjectGroupViewModel>>($"api/SubjectGroupApi/GetAll?includeDeleted={includeDeleted}&sessionId={sessionId}&companyId={companyId}");
        }

        public async Task<ApiResponse<MstSubjectGroupViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<MstSubjectGroupViewModel>($"api/SubjectGroupApi/GetByID/{id}");
        }

        public async Task<ApiResponse<dynamic>> UpsertAsync(MstSubjectGroupUpsertRequest request)
        {
            return await PostAsync<dynamic>("api/SubjectGroupApi/Upsert", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/SubjectGroupApi/Delete", ids!);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/SubjectGroupApi/ToggleStatus", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetAllSubjectByClassandSectionIdAsync(int companyId, int sessionId, int classId, int sectionId)
        {
            return await GetAsync<List<DropdownModel>>($"api/SubjectGroupApi/GetAllSubjectByClassandSectionId?companyId={companyId}&sessionId={sessionId}&classId={classId}&sectionId={sectionId}");
        }

        public async Task<ApiResponse<PagedResult<MstSubjectGroupViewModel>>> GetAllSubjectGroupWithPageAsync(SubjectGroupSearchRequest request)
        {
            return await PostAsync<PagedResult<MstSubjectGroupViewModel>>("api/SubjectGroupApi/GetAllSubjectGroupWithPage", request);
        }
    }
}
