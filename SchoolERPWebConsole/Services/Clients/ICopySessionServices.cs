using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface ICopySessionServices
    {
        Task<ApiResponse<List<StudentListViewModel>>> GetStudentListAsync(
    int companyId,
    int sessionId);
        Task<ApiResponse<SpResult>> CopyStudentAsync(CopyRequest req);

        Task<ApiResponse<SpResult>> CopySubjectAsync(CopyRequest req);

        Task<ApiResponse<SpResult>> CopyClasssAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyStudentHouseAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyRoomTypesAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyHostelsAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyHostelTypeAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyHolidaysAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyHolidayTypeAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyCountrysAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyStatesAsync(CopyRequest req);
        Task<ApiResponse<SpResult>> CopyRoomCoolingTypeAsync(CopyRequest req);
    }

    
}
