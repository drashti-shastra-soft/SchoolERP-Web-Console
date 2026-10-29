using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class BackDateSettingClientService : BaseApiClient, IBackDateSettingClientService
    {
        public BackDateSettingClientService(HttpClient client) : base(client) { }

        public async Task<ApiResponse<dynamic>> UpsertBackDateSettingAsync(SaveBackDateSettingRequest request)
        {
            return await PostAsync<dynamic>($"api/BackDateSettingAPI/Save", request);
        }
        public async Task<ApiResponse<BackDateSettingViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<BackDateSettingViewModel>($"api/BackDateSettingAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<BackDateSettingViewModel>>> GetAllAttendanceBackDateSettingWithPageAsync(BackDateSettingSearchRequest request)
        {
            return await PostAsync<PagedResult<BackDateSettingViewModel>>("api/BackDateSettingAPI/GetAllAttendanceBackDateSettingWithPage", request);
        }

        public async Task<ApiResponse<int>> GetBackDateCountAsync(int companyId, int staffID, int roleId)
        {
            return await GetAsync<int>($"api/BackDateSettingAPI/GetBackDateCount?companyId={companyId}&staffID={staffID}&roleId={roleId}");
        }

        public async Task<ApiResponse<BackDateSettingViewModel>> GetAttendanceBackDateSettingByStaffIdAsync(int id)
        {
            return await GetAsync<BackDateSettingViewModel>($"api/BackDateSettingAPI/GetAttendanceBackDateSettingByStaffId?staffID={id}");
        }
    }
}
