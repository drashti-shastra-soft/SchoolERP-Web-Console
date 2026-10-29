using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class TeacherDashboardClientService : BaseApiClient, ITeacherDashboardClientService
    {
        public TeacherDashboardClientService(HttpClient httpClient) : base(httpClient) { }

        public async Task<ApiResponse<List<TeacherTimetableDto>>> GetTimetableAsync()
        {
            return await GetAsync<List<TeacherTimetableDto>>("api/TeacherDashboardApi/GetTimetable");
        }

        public async Task<ApiResponse<List<TeacherStudentDto>>> GetStudentsAsync()
        {
            return await GetAsync<List<TeacherStudentDto>>("api/TeacherDashboardApi/GetStudents");
        }

        public async Task<ApiResponse<List<TeacherHomeworkDto>>> GetHomeworkAsync()
        {
            return await GetAsync<List<TeacherHomeworkDto>>("api/TeacherDashboardApi/GetHomework");
        }

        public async Task<ApiResponse<List<TeacherHWSubmissionDto>>> GetHWSubmissionsAsync()
        {
            return await GetAsync<List<TeacherHWSubmissionDto>>("api/TeacherDashboardApi/GetHWSubmissions");
        }

        public async Task<ApiResponse<List<TeacherAttendanceDto>>> GetAttendanceAsync()
        {
            return await GetAsync<List<TeacherAttendanceDto>>("api/TeacherDashboardApi/GetAttendance");
        }

        public async Task<ApiResponse<List<HRStaffListDto>>> GetStaffListAsync()
        {
            return await GetAsync<List<HRStaffListDto>>("api/HRDashboardApi/GetStaffList");
        }

        public async Task<ApiResponse<List<HRDeptCountDto>>> GetDeptCountAsync()
        {
            return await GetAsync<List<HRDeptCountDto>>("api/HRDashboardApi/GetDeptCount");
        }

        public async Task<ApiResponse<List<HRNewJoiningDto>>> GetNewJoiningsAsync()
        {
            return await GetAsync<List<HRNewJoiningDto>>("api/HRDashboardApi/GetNewJoinings");
        }

        public async Task<ApiResponse<List<HRLeaveSummaryDto>>> GetLeaveSummaryAsync()
        {
            return await GetAsync<List<HRLeaveSummaryDto>>("api/HRDashboardApi/GetLeaveSummary");
        }
    }
}
