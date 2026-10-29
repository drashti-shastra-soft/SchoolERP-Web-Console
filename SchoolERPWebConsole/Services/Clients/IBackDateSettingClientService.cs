using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IBackDateSettingClientService
    {
        Task<ApiResponse<dynamic>> UpsertBackDateSettingAsync(SaveBackDateSettingRequest request);
        Task<ApiResponse<BackDateSettingViewModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<BackDateSettingViewModel>>> GetAllAttendanceBackDateSettingWithPageAsync(BackDateSettingSearchRequest request);
        Task<ApiResponse<int>> GetBackDateCountAsync(int companyId, int staffID, int roleId);
        Task<ApiResponse<BackDateSettingViewModel>> GetAttendanceBackDateSettingByStaffIdAsync(int id);
    }
}
