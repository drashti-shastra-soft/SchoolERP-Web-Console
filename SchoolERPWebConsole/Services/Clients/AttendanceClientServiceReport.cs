using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class AttendanceClientServiceReport : BaseApiClient, IAttendanceClientServiceReport
    {
        public AttendanceClientServiceReport(HttpClient client) : base(client) { }

        public async Task<ApiResponse<AttendanceMonthlyPagedResult<AttendanceMonthlyResponse>>> GetAttendanceMonthlyReportAsync(AttendanceMonthlyReportRequest request)
        {
            return await PostAsync<AttendanceMonthlyPagedResult<AttendanceMonthlyResponse>>(
                "api/AttendanceServiceAPIReport/GetAttendanceMonthlyReport", request);
        }
        public async Task<ApiResponse<PagedResult<AttendanceTypeReportResponse>>> GetAttendanceTypeReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<AttendanceTypeReportResponse>>(
                "api/AttendanceServiceAPIReport/GetAttendanceTypeReport", request);
        }
        public async Task<ApiResponse<PagedResult<AttendanceDailyReportResponse>>> GetAttendanceDailyReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<AttendanceDailyReportResponse>>(
                "api/AttendanceServiceAPIReport/GetAttendanceDailyReport", request);
        }

        public async Task<ApiResponse<PagedResult<AttendanceDayWiseReportResponse>>> GetAttendanceDailyWiseReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<AttendanceDayWiseReportResponse>>(
                "api/AttendanceServiceAPIReport/GetAttendanceDailyWiseReport", request);
        }

        public async Task<ApiResponse<AttendanceMonthlyPagedResult<AttendanceStaffMonthlyResponse>>> GetAttendanceStaffMonthlyReportAsync(AttendanceMonthlyReportRequest request)
        {
            return await PostAsync<AttendanceMonthlyPagedResult<AttendanceStaffMonthlyResponse>>(
                "api/AttendanceServiceAPIReport/GetAttendanceStaffMonthlyReport", request);
        }

        public async Task<ApiResponse<PagedResult<StaffAttendanceDayWiseReportResponse>>> GetStaffAttendanceDayWiseReportAsync(StudentReportRequest request)
        {
            return await PostAsync<PagedResult<StaffAttendanceDayWiseReportResponse>>(
                "api/AttendanceServiceAPIReport/GetStaffAttendanceDayWiseReport", request);
        }
    }
}
