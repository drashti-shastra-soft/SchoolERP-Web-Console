using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IAttendanceClientServiceReport
    {
        Task<ApiResponse<AttendanceMonthlyPagedResult<AttendanceMonthlyResponse>>> GetAttendanceMonthlyReportAsync(AttendanceMonthlyReportRequest request);
        Task<ApiResponse<PagedResult<AttendanceTypeReportResponse>>> GetAttendanceTypeReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<AttendanceDailyReportResponse>>> GetAttendanceDailyReportAsync(StudentReportRequest request);
        Task<ApiResponse<PagedResult<AttendanceDayWiseReportResponse>>> GetAttendanceDailyWiseReportAsync(StudentReportRequest request);
        Task<ApiResponse<AttendanceMonthlyPagedResult<AttendanceStaffMonthlyResponse>>> GetAttendanceStaffMonthlyReportAsync(AttendanceMonthlyReportRequest request);
        Task<ApiResponse<PagedResult<StaffAttendanceDayWiseReportResponse>>> GetStaffAttendanceDayWiseReportAsync(StudentReportRequest request);
    }
}
