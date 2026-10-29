using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ICoScholasticClientService
    {
        Task<ApiResponse<PagedResult<CoScholasticViewModel>>> GetAllCoScholasticWithPageAsync(CoScholasticSearchRequest request);
        Task<ApiResponse<CoScholasticViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertAsync(CoScholasticRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<CoScholasticViewModel>>> GetAllAsync(int? companyId = null, bool? isActive = null);
        Task<ApiResponse<List<ClassCoScholasticTreeItemViewModel>>> GetClassTreeAsync(int? companyId = null, int? sessionId = null, int? classId = null);
        Task<ApiResponse<dynamic>> UpsertClassCoScholasticAsync(ClassCoScholasticSaveRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetClassCoScholasticListAsync(int? companyId = null, int? sessionId = null, int? classId = null);
    }
}
