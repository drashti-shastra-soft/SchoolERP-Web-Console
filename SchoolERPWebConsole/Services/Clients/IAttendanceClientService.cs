using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IAttendanceClientService
    {
        Task<ApiResponse<StudentAttendanceHistoryViewModel>> GetStudentAttendanceHistoryAsync(
            int studentId,
            int year,
            int companyId);
        /// <summary>
        /// Retrieves the student attendance list.
        /// </summary>
        Task<ApiResponse<List<StudentAttendanceViewModel>>> GetStudentAttendanceList(
            int classId,
            int sectionId,
            DateTime date,
            int companyId);

        Task<ApiResponse<object>> SaveBulkAttendanceAsync(
            AttendanceUpsertRequest request);

        Task<ApiResponse<PagedResult<StudentLeaveViewModel>>> GetAllLeaveApplicationsWithPageAsync(StudentLeaveSearchRequest request);
        Task<ApiResponse<PagedResult<StudentAttendanceViewModel>>> GetAllStudentAttendanceWithPageAsync(StudentAttendanceSearchRequest request);

        Task<ApiResponse<StudentAttendanceSummaryModel>> GetStudentAttendanceSummaryAsync(
            int companyId, int sessionId, int studentId, int? year = null, int? status = null);

        Task<ApiResponse<AttendanceCountViewModel>> GetPresentStudentCountAsync(ReqAttendanceCountModel request);
        Task<ApiResponse<StaffAttendanceCountViewModel>> GetPresentStaffCountAsync(ReqAttendanceCountModel request);
    }
}
