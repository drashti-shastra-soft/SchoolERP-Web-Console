using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface ITeacherDashboardClientService
    {
        Task<ApiResponse<List<TeacherTimetableDto>>> GetTimetableAsync();
        Task<ApiResponse<List<TeacherStudentDto>>> GetStudentsAsync();
        Task<ApiResponse<List<TeacherHomeworkDto>>> GetHomeworkAsync();
        Task<ApiResponse<List<TeacherHWSubmissionDto>>> GetHWSubmissionsAsync();
        Task<ApiResponse<List<TeacherAttendanceDto>>> GetAttendanceAsync();
        Task<ApiResponse<List<HRStaffListDto>>> GetStaffListAsync();
        Task<ApiResponse<List<HRDeptCountDto>>> GetDeptCountAsync();
        Task<ApiResponse<List<HRNewJoiningDto>>> GetNewJoiningsAsync();
        Task<ApiResponse<List<HRLeaveSummaryDto>>> GetLeaveSummaryAsync();
    }
}
