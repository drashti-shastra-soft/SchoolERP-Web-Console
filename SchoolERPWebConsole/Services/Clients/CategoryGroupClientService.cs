using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class CategoryGroupClientService : BaseApiClient, ICategoryGroupClientService
    {
        public CategoryGroupClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<SpResult>> UpsertCategoryGroupAsync(CategoryGroupRequest request)
        {
            return await PostAsync<SpResult>("api/CategoryGroupAPI/Save", request);
        }
        
        public async Task<ApiResponse<CategoryGroupViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<CategoryGroupViewModel>($"api/CategoryGroupAPI/GetById/{id}");
        }

        public async Task<ApiResponse<List<CategoryGroupViewModel>>> GetAllAsync(int? companyId = null, int? sessionId = null)
        {
            return await GetAsync<List<CategoryGroupViewModel>>($"api/CategoryGroupAPI/GetAll?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<PagedResult<CategoryGroupViewModel>>> GetAllCategoryGroupWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<CategoryGroupViewModel>>("api/CategoryGroupAPI/GetAllCategoryGroupWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/CategoryGroupAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CategoryGroupAPI/ToggleStatus", request);
        }
        public async Task<ApiResponse<dynamic>> CopyCategoryGroupAsync(CopyRequest request)
        {
            return await PostAsync<dynamic>("api/CategoryGroupAPI/CopyCategoryGroup", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetCategoryGroupDropdownListAsync(int? companyId = null, int? sessionID=null)
        {
            return await GetAsync<List<DropdownModel>>($"api/CategoryGroupAPI/GetCategoryGroupDropdownList?companyId={companyId}&sessionID={sessionID}");
        }
    }
}
