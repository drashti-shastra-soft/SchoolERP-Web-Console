using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// Defines client-side operations for managing academic schedules, class teachers, and student promotions.
    /// Provides asynchronous methods for interacting with the backend Academics API.
    /// </summary>
    public interface IAcademicsClientService
    {
        /// <summary>
        /// Retrieves the timetable for a specific class and section asynchronously.
        /// Use this to get all scheduled periods for a class-section combination.
        /// </summary>
        Task<ApiResponse<List<TimeTableViewModel>>> GetTimeTableByClassAsync(int classId, int sectionId, int companyId, int sessionId);

        /// <summary>
        /// Retrieves the timetable for a specific staff member (teacher) asynchronously.
        /// Use this to get all periods assigned to a staff member, filtered by company and session if provided.
        /// </summary>
        Task<ApiResponse<List<TimeTableViewModel>>> GetTimeTableByStaffAsync(TimeTableSearchRequest request);

        /// <summary>
        /// Creates or updates a timetable slot (period) for a class/section/subject/staff asynchronously.
        /// Use this to add or edit a timetable entry. Ensures company and session context is set.
        /// </summary>
        Task<ApiResponse<dynamic>> UpsertTimeTableAsync(TimeTableUpsertRequest req);

        /// <summary>
        /// Deletes a timetable slot by its unique ID asynchronously.
        /// Use this to remove a specific period from the timetable.
        /// </summary>
        Task<ApiResponse<dynamic>> DeleteTimeTableSlotAsync(int id);

        /// <summary>
        /// Retrieves all class teacher assignments for the given classes and sections in a session asynchronously.
        /// Use this to get which staff are assigned as class teachers for multiple classes/sections.
        /// </summary>
        Task<ApiResponse<List<ClassTeacherViewModel>>> GetAllClassTeachersAsync(
            List<int>? classIds = null,
            List<int>? sectionIds = null, int? sessionID = null);

        /// <summary>
        /// Creates or updates a class teacher assignment asynchronously.
        /// Use this to assign or update staff as class teachers for classes/sections.
        /// </summary>
        Task<ApiResponse<dynamic>> UpsertClassTeacherAsync(ClassTeacherUpsertRequest req);

        /// <summary>
        /// Deletes one or more class teacher assignments by their IDs asynchronously.
        /// Use this to remove class teacher assignments.
        /// </summary>
        Task<ApiResponse<dynamic>> DeleteClassTeacherAsync(List<int> ids);

        /// <summary>
        /// Retrieves all students eligible for promotion in a given class and section asynchronously.
        /// Use this to get the list of students for the promotion process.
        /// </summary>
        Task<ApiResponse<List<StudentPromotionViewModel>>> GetStudentsForPromotionAsync(int classId, int sectionId, int companyId, int sessionId);

        /// <summary>
        /// Promotes students to the next class or section asynchronously.
        /// Use this to finalize and save student promotions.
        /// </summary>
        Task<ApiResponse<dynamic>> PromoteStudentsAsync(PromotionRequest req);

        /// <summary>
        /// Retrieves a paginated list of class teacher assignments based on search and filter criteria asynchronously.
        /// Use this for displaying assignments in a paged grid or table.
        /// </summary>
        Task<ApiResponse<PagedResult<ClassTeacherViewModel>>> GetAllClassWithPageAsync(AcademicsSearchRequest request);

        /// <summary>
        /// Retrieves a paginated list of students eligible for promotion, based on search and filter criteria asynchronously.
        /// Use this for displaying students in a paged grid or table during the promotion process.
        /// </summary>
        Task<ApiResponse<PagedResult<StudentPromotionViewModel>>> GetForPromotionPageIndexAsync(SearchPromotedStudent req);

        /// <summary>
        /// Retrieves a paginated list of students eligible for promotion, based on search and filter criteria asynchronously.
        /// Use this for displaying students in a paged grid or table during the promotion process.
        /// </summary>
        Task<ApiResponse<PagedResult<StudentDemotionViewModel>>> GetForDemotionPageIndexAsync(SearchPromotedStudent req);
        /// <summary>
        /// Retrieves a timetable slot by its unique ID asynchronously.
        /// Use this to fetch details of a specific timetable entry for viewing or editing.
        /// </summary>
        Task<ApiResponse<TimeTableViewModel>> GetTimeTableByIdAsync(int companyId, int sessionId, int timeTableID);

        /// <summary>
        /// Toggles the active status (enable/disable) of one or more class teacher assignments asynchronously.
        /// Use this to activate or deactivate class teacher assignments without deleting them.
        /// </summary>
        Task<ApiResponse<dynamic>> ToggleAcademicsClassTeacherStatusAsync(StatusUpdateRequest request);

        /// <summary>
        /// Creates or updates multiple timetable slots in bulk asynchronously.
        /// Use this to add or edit several timetable entries at once (e.g., for a whole class or section).
        /// </summary>
        Task<ApiResponse<dynamic>> UpsertBulkTimeTableAsync(BulkTimeTableUpsertRequest req);

        Task<ApiResponse<DemoteResponse>> DemoteStudentsAsync(DemotionRequest req);
    }
}
