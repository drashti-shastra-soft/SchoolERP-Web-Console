using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IHolidayTypeClientService
    {
        Task<ApiResponse<dynamic>> UpsertHolidayTypeAsync(HolidayTypeRequest request);
        Task<ApiResponse<HolidayType>> GetByIDAsync(int id);
        Task<ApiResponse<List<HolidayType>>> GetAllAsync(int? companyId = null, int? sessionId = null);
        Task<ApiResponse<PagedResult<HolidayType>>> GetAllHostelTypeWithPageAsync(HostelTypeSearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
    }
}
