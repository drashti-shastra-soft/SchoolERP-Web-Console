using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class AcademicsClientService : BaseApiClient, IAcademicsClientService
    {
        public AcademicsClientService(HttpClient client) : base(client) { }

        /// <summary>
        /// Retrieves the timetable for a specific class and section asynchronously.
        /// Use this to get all scheduled periods for a class-section combination.
        /// </summary>
        public Task<ApiResponse<List<TimeTableViewModel>>> GetTimeTableByClassAsync(int classId, int sectionId, int companyId, int sessionId)
            => GetAsync<List<TimeTableViewModel>>($"api/AcademicsApi/GetTimeTableByClass?classId={classId}&sectionId={sectionId}&companyId={companyId}&sessionId={sessionId}");


        /// <summary>
        /// Retrieves the timetable for a specific staff member (teacher) asynchronously.
        /// Use this to get all periods assigned to a staff member, filtered by company and session if provided.
        /// </summary>
        public async Task<ApiResponse<List<TimeTableViewModel>>> GetTimeTableByStaffAsync(TimeTableSearchRequest request)
        {
            return await PostAsync<List<TimeTableViewModel>>($"api/AcademicsApi/GetTimeTableByStaff", request);
        }

        /// <summary>
        /// Creates or updates a timetable slot (period) for a class/section/subject/staff asynchronously.
        /// Use this to add or edit a timetable entry. Ensures company and session context is set.
        /// </summary>
        public Task<ApiResponse<dynamic>> UpsertTimeTableAsync(TimeTableUpsertRequest req)
            => PostAsync<dynamic>("api/AcademicsApi/UpsertTimeTable", req);

        /// <summary>
        /// Deletes a timetable slot by its unique ID asynchronously.
        /// Use this to remove a specific period from the timetable.
        /// </summary>
        public Task<ApiResponse<dynamic>> DeleteTimeTableSlotAsync(int id)
            => PostAsync<dynamic>($"api/AcademicsApi/DeleteTimeTableSlot/{id}", null!);

        //public Task<ApiResponse<List<ClassTeacherViewModel>>> GetAllClassTeachersAsync()
        //    => GetAsync<List<ClassTeacherViewModel>>("api/AcademicsApi/GetAllClassTeachers");

        /// <summary>
        /// Retrieves all class teacher assignments for the given classes and sections in a session asynchronously.
        /// Use this to get which staff are assigned as class teachers for multiple classes/sections.
        /// </summary>
        public Task<ApiResponse<List<ClassTeacherViewModel>>> GetAllClassTeachersAsync(
            List<int>? classIds = null,
            List<int>? sectionIds = null, int? sessionID=null)
        {
            var query = new List<string>();

            if (classIds?.Any() == true)
                query.AddRange(classIds.Select(x => $"classId={x}"));

            if (sectionIds?.Any() == true)
                query.AddRange(sectionIds.Select(x => $"sectionId={x}"));
            
            if (sessionID.HasValue)
                query.Add($"sessionID={sessionID.Value}");

            var url = "api/AcademicsApi/GetAllClassTeachers";

            if (query.Any())
                url += "?" + string.Join("&", query);

            return GetAsync<List<ClassTeacherViewModel>>(url);
        }

        /// <summary>
        /// Creates or updates a class teacher assignment asynchronously.
        /// Use this to assign or update staff as class teachers for classes/sections.
        /// </summary>
        public Task<ApiResponse<dynamic>> UpsertClassTeacherAsync(ClassTeacherUpsertRequest req)
            => PostAsync<dynamic>("api/AcademicsApi/UpsertClassTeacher", req);

        /// <summary>
        /// Deletes one or more class teacher assignments by their IDs asynchronously.
        /// Use this to remove class teacher assignments.
        /// </summary>
        public Task<ApiResponse<dynamic>> DeleteClassTeacherAsync(List<int> ids)
            => PostAsync<dynamic>($"api/AcademicsApi/DeleteClassTeacher", ids!);

        /// <summary>
        /// Retrieves all students eligible for promotion in a given class and section asynchronously.
        /// Use this to get the list of students for the promotion process.
        /// </summary>
        public Task<ApiResponse<List<StudentPromotionViewModel>>> GetStudentsForPromotionAsync(int classId, int sectionId, int companyId, int sessionId)
            => GetAsync<List<StudentPromotionViewModel>>($"api/AcademicsApi/GetStudentsForPromotion?classId={classId}&sectionId={sectionId}&companyId={companyId}&sessionId={sessionId}");

        /// <summary>
        /// Promotes students to the next class or section asynchronously.
        /// Use this to finalize and save student promotions.
        /// </summary>
        public Task<ApiResponse<dynamic>> PromoteStudentsAsync(PromotionRequest req)
            => PostAsync<dynamic>("api/AcademicsApi/PromoteStudents", req);

        /// <summary>
        /// Retrieves a paginated list of class teacher assignments based on search and filter criteria asynchronously.
        /// Use this for displaying assignments in a paged grid or table.
        /// </summary>
        public async Task<ApiResponse<PagedResult<ClassTeacherViewModel>>> GetAllClassWithPageAsync(AcademicsSearchRequest request)
        {
            return await PostAsync<PagedResult<ClassTeacherViewModel>>("api/AcademicsApi/GetAllClassTeachersWithPage", request);
        }
        /// <summary>
        /// Retrieves a paginated list of admission inquiries based on search and filter criteria asynchronously.
        /// Use this for displaying admission inquiries in a paged grid or table.
        /// </summary>
        public Task<ApiResponse<PagedResult<FOAdmissionInquiryViewModel>>> GetAllAdmissionInquiriesWithPageIndexAsync(EnquirySearchRequest req)
            => PostAsync<PagedResult<FOAdmissionInquiryViewModel>>("api/FrontOfficeApi/GetAllAdmissionInquiriesWithPageIndex", req);
        /// <summary>
        /// Retrieves a paginated list of students eligible for promotion, based on search and filter criteria asynchronously.
        /// Use this for displaying students in a paged grid or table during the promotion process.
        /// </summary>
        public Task<ApiResponse<PagedResult<StudentPromotionViewModel>>> GetForPromotionPageIndexAsync(SearchPromotedStudent req)
           => PostAsync<PagedResult<StudentPromotionViewModel>>("api/AcademicsApi/GetForPromotionPageIndex", req);

        /// <summary>
        /// Retrieves a timetable slot by its unique ID asynchronously.
        /// Use this to fetch details of a specific timetable entry for viewing or editing.
        /// </summary>
        public async Task<ApiResponse<TimeTableViewModel>> GetTimeTableByIdAsync(int companyId, int sessionId, int timeTableID)
        {
            return await GetAsync<TimeTableViewModel>($"api/AcademicsApi/GetTimeTableById?companyId={companyId}&sessionId={sessionId}&timeTableID={timeTableID}");
        }

        /// <summary>
        /// Toggles the active status (enable/disable) of one or more class teacher assignments asynchronously.
        /// Use this to activate or deactivate class teacher assignments without deleting them.
        /// </summary>
        public async Task<ApiResponse<dynamic>> ToggleAcademicsClassTeacherStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/AcademicsApi/ToggleAcademicsClassTeacherStatus", request);
        }

        /// <summary>
        /// Creates or updates multiple timetable slots in bulk asynchronously.
        /// Use this to add or edit several timetable entries at once (e.g., for a whole class or section).
        /// </summary>
        public Task<ApiResponse<dynamic>> UpsertBulkTimeTableAsync(BulkTimeTableUpsertRequest req)
            => PostAsync<dynamic>("api/AcademicsApi/UpsertBulkTimeTable", req);


        /// <summary>
        /// Retrieves a paginated list of students eligible for promotion, based on search and filter criteria asynchronously.
        /// Use this for displaying students in a paged grid or table during the promotion process.
        /// </summary>
        public Task<ApiResponse<PagedResult<StudentDemotionViewModel>>> GetForDemotionPageIndexAsync(SearchPromotedStudent req)
           => PostAsync<PagedResult<StudentDemotionViewModel>>("api/AcademicsApi/GetForDemotionPageIndex", req);

        /// <summary>
        /// Promotes students to the next class or section asynchronously.
        /// Use this to finalize and save student promotions.
        /// </summary>
        public Task<ApiResponse<DemoteResponse>> DemoteStudentsAsync(DemotionRequest req)
     => PostAsync<DemoteResponse>("api/AcademicsApi/DemoteStudents", req);
    }
}
