using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class HumanResourceClientService : BaseApiClient, IHumanResourceClientService
    {
        public HumanResourceClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<HRDesignationViewModel>>> GetAllDesignationsAsync(int companyId, int sessionId)
            => GetAsync<List<HRDesignationViewModel>>($"api/HumanResourceApi/GetAllDesignations?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<HRDesignationViewModel>> GetDesignationByIDAsync(int id)
            => GetAsync<HRDesignationViewModel>($"api/HumanResourceApi/GetDesignationByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertDesignationAsync(HRDesignationUpsertRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/UpsertDesignation", req);

        public Task<ApiResponse<dynamic>> DeleteDesignationAsync(List<int> id)
            => PostAsync<dynamic>($"api/HumanResourceApi/DeleteDesignation", id);

        //public Task<ApiResponse<dynamic>> ToggleDesignationStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/HumanResourceApi/ToggleDesignationStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleDesignationStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/HumanResourceApi/ToggleDesignationStatus", request);
        }

        public Task<ApiResponse<DepartmentListResponse>> GetAllDepartmentsAsync(int companyId, int sessionId)
            => GetAsync<DepartmentListResponse>($"api/HumanResourceApi/GetAllDepartments?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<HRDepartmentViewModel>> GetDepartmentByIDAsync(int id)
            => GetAsync<HRDepartmentViewModel>($"api/HumanResourceApi/GetDepartmentByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertDepartmentAsync(HRDepartmentUpsertRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/UpsertDepartment", req);

        public Task<ApiResponse<dynamic>> DeleteDepartmentAsync(List<int> id)
            => PostAsync<dynamic>($"api/HumanResourceApi/DeleteDepartment",id);

        //public Task<ApiResponse<dynamic>> ToggleDepartmentStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/HumanResourceApi/ToggleDepartmentStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleDepartmentStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/HumanResourceApi/ToggleDepartmentStatus", request);
        }

        public Task<ApiResponse<List<HRLeaveTypeViewModel>>> GetAllLeaveTypesAsync(int sessionID, int companyId)
            => GetAsync<List<HRLeaveTypeViewModel>>($"api/HumanResourceApi/GetAllLeaveTypes?sessionID={sessionID}&companyId={companyId}");

        public Task<ApiResponse<HRLeaveTypeViewModel>> GetLeaveTypeByIDAsync(int id)
            => GetAsync<HRLeaveTypeViewModel>($"api/HumanResourceApi/GetLeaveTypeByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertLeaveTypeAsync(HRLeaveTypeUpsertRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/UpsertLeaveType", req);

        public Task<ApiResponse<dynamic>> DeleteLeaveTypeAsync(List<int> id)
            => PostAsync<dynamic>($"api/HumanResourceApi/DeleteLeaveType", id);

        public async Task<ApiResponse<List<StaffDashboardDto>>> GetStaffDashboardAsync()
        {
            return await GetAsync<List<StaffDashboardDto>>("api/HumanResourceApi/GetStaffDashboard");
        }
        public Task<ApiResponse<dynamic>> ToggleLeaveTypeStatusAsync(StatusUpdateRequest request)
            => PostAsync<dynamic>($"api/HumanResourceApi/ToggleLeaveTypeStatus", request);

        public Task<ApiResponse<List<HRStaffViewModel>>> GetAllStaffAsync(int companyId, int sessionId, int? staffId=null)
            => GetAsync<List<HRStaffViewModel>>($"api/HumanResourceApi/GetAllStaff?companyId={companyId}&sessionId={sessionId}&staffId={staffId}");

        public Task<ApiResponse<HRStaffViewModel>> GetStaffByIDAsync(int id)
            => GetAsync<HRStaffViewModel>($"api/HumanResourceApi/GetStaffByID/{id}");

        public Task<ApiResponse<SpResult>> UpsertStaffAsync(HRStaffUpsertRequest req)
            => PostAsync<SpResult>("api/HumanResourceApi/UpsertStaff", req);

        public Task<ApiResponse<dynamic>> DeleteStaffAsync(List<int> id)
            => PostAsync<dynamic>($"api/HumanResourceApi/DeleteStaff", id);

        public Task<ApiResponse<string>> GetNewStaffCodeAsync(int companyId, int sessionId)
            => GetAsync<string>($"api/HumanResourceApi/GetNewStaffCode?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<List<HRStaffAttendanceViewModel>>> GetStaffAttendanceAsync(DateTime date, int? roleId)
            => GetAsync<List<HRStaffAttendanceViewModel>>($"api/HumanResourceApi/GetStaffAttendance?date={date:yyyy-MM-dd}&roleId={roleId}");

        public async Task<ApiResponse<PagedResult<HRStaffAttendanceViewModel>>> GetAllStaffAttendanceWithPageAsync(HRStaffAttendanceSearchRequest request)
        {
            return await PostAsync<PagedResult<HRStaffAttendanceViewModel>>($"api/HumanResourceApi/GetAllStaffAttendanceWithPage", request);
        }

        public Task<ApiResponse<dynamic>> SaveStaffAttendanceAsync(HRStaffAttendanceUpsertRequestModel reqs)
            => PostAsync<dynamic>("api/HumanResourceApi/SaveStaffAttendance", reqs);

        // --- Apply Leave ---
        public Task<ApiResponse<List<HRApplyLeaveViewModel>>> GetAllApplyLeaveAsync()
            => GetAsync<List<HRApplyLeaveViewModel>>("api/HumanResourceApi/GetAllApplyLeave");

        public Task<ApiResponse<HRApplyLeaveViewModel>> GetApplyLeaveByIDAsync(int id)
            => GetAsync<HRApplyLeaveViewModel>($"api/HumanResourceApi/GetApplyLeaveByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertApplyLeaveAsync(HRApplyLeaveUpsertRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/UpsertApplyLeave", req);

        public Task<ApiResponse<dynamic>> DeleteApplyLeaveAsync(List<int> id)
            => PostAsync<dynamic>($"api/HumanResourceApi/DeleteApplyLeave", id);

        // --- Payroll ---
        public Task<ApiResponse<List<HRPayrollViewModel>>> GetAllPayrollAsync(int month, int year, int? roleId)
            => GetAsync<List<HRPayrollViewModel>>($"api/HumanResourceApi/GetAllPayroll?month={month}&year={year}&roleId={roleId}");

        public Task<ApiResponse<dynamic>> GeneratePayrollAsync(HRPayrollGenerateRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/GeneratePayroll", req);

        /// <summary>
        /// Retrieves a staff document.
        /// </summary>
        /// <param name="staffId">Staff identifier.</param>
        /// <param name="docType">Document type.</param>
        /// <returns>Document information.</returns>
        public Task<ApiResponse<HttpResponseMessage>> GetStaffDocumentAsync(
            int staffId,
            string docType)
            => GetAsync<HttpResponseMessage>(
                $"api/HumanResourceApi/GetStaffDocument?staffId={staffId}&docType={Uri.EscapeDataString(docType)}");

        /// <summary>
        /// Retrieves an applied leave attachment document.
        /// </summary>
        /// <param name="id">Apply leave identifier.</param>
        /// <returns>Document information.</returns>
        public Task<ApiResponse<HttpResponseMessage>> GetApplyLeaveDocumentAsync(int id)
            => GetAsync<HttpResponseMessage>(
                $"api/HumanResourceApi/GetApplyLeaveDocument?id={id}");

        /// <summary>
        /// Retrieves payroll generation data for a staff member.
        /// </summary>
        /// <param name="staffId">Staff identifier.</param>
        /// <param name="month">Payroll month.</param>
        /// <param name="year">Payroll year.</param>
        /// <returns>Payroll generation data.</returns>
        public Task<ApiResponse<HRPayrollGenerationViewModel>> GetPayrollGenerationDataAsync(
            int staffId,
            int month,
            int year, int companyId, int sessionId)
            => GetAsync<HRPayrollGenerationViewModel>(
                $"api/HumanResourceApi/GetPayrollGenerationData?staffId={staffId}&month={month}&year={year}&companyId={companyId}&sessionId={sessionId}");


        public Task<ApiResponse<dynamic>> UpdateProfileAsync(ProfileRequest req)
           => PostAsync<dynamic>("api/HumanResourceApi/UpdateProfile", req);

        public async Task<ApiResponse<PagedResult<HRDepartmentViewModel>>> GetAllDepartmentsWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<HRDepartmentViewModel>>("api/HumanResourceApi/GetAllDepartmentsWithPage", request);
        }

        public async Task<ApiResponse<PagedResult<HRDesignationViewModel>>> GetAllDesignationsWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<HRDesignationViewModel>>("api/HumanResourceApi/GetAllDesignationsWithPage", request);
        }

        public async Task<ApiResponse<PagedResult<HRLeaveTypeViewModel>>> GetAllLeaveTypesWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<HRLeaveTypeViewModel>>("api/HumanResourceApi/GetAllLeaveTypesWithPage", request);
        }

        public Task<ApiResponse<LeaveQuotaModel>> GetLeaveTypeWiseBalanceAsync(int leaveTypeId, int staffId)
            => GetAsync<LeaveQuotaModel>(
                $"api/HumanResourceApi/GetLeaveTypeWiseBalance?leaveTypeId={leaveTypeId}&staffId={staffId}");

        public async Task<ApiResponse<PagedResult<HRApplyLeaveViewModel>>> GetAllApplyLeaveWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<HRApplyLeaveViewModel>>("api/HumanResourceApi/GetAllApplyLeaveWithPage", request);
        }

        public async Task<ApiResponse<StaffAttendanceSummaryModel>> GetStaffAttendanceSummaryAsync(
            int companyId, int sessionId, int staffId, int? year = null, int? status = null)
        {
            return await GetAsync<StaffAttendanceSummaryModel>(
                $"api/HumanResourceApi/GetStaffAttendanceSummary?" +
                $"companyId={companyId}" +
                $"&sessionId={sessionId}" +
                $"&staffId={staffId}" +
                $"&year={year}&status={status}");
        }

        public Task<ApiResponse<HRStaffTimelineViewModel>> GetTimelineByIDsync(int id)
            => GetAsync<HRStaffTimelineViewModel>($"api/HumanResourceApi/GetTimelineByID/{id}");

        public Task<ApiResponse<UpsertStaffTimelineResponse>> UpsertTimelineAsync(
            HRStaffTimelineUpsertRequest request)
        {
            return PostAsync<UpsertStaffTimelineResponse>(
                "api/HumanResourceApi/UpsertTimeline",
                request);
        }

        public Task<ApiResponse<dynamic>> UpsertStaffTimelineAttachmentFileAsync(StudentTimelineAttachmentUpsertRequest req)
            => PostAsync<dynamic>("api/HumanResourceApi/UpsertStaffTimelineAttachmentFile", req);

        public Task<ApiResponse<List<HRStaffTimelineViewModel>>> GetStaffTimelineAsync(int staffId)
        {
            return GetAsync<List<HRStaffTimelineViewModel>>(
                $"api/HumanResourceApi/GetStaffTimeline/{staffId}");
        }
        public Task<ApiResponse<object>> DeleteTimelineAsyc(int id)
        {
            return PostAsync<object>(
                $"api/HumanResourceApi/DeleteTimeline/{id}",
                new { });
        }

        public Task<ApiResponse<dynamic>> ToggleStaffStatusAsync(HRStaffStatusToggleRequest request)
            => PostAsync<dynamic>($"api/HumanResourceApi/ToggleStaffStatus", request);

        public Task<ApiResponse<dynamic>> ChangeStaffPasswordAsync(HRStaffChangePasswordRequest request)
           => PostAsync<dynamic>($"api/HumanResourceApi/ChangeStaffPassword", request);

        public async Task<ApiResponse<PagedResult<HRStaffViewModel>>> GetAllStaffWithPageAsync(SearchHRStaffRequest request)
        {
            return await PostAsync<PagedResult<HRStaffViewModel>>("api/HumanResourceApi/GetAllStaffWithPage", request);
        }
        public async Task<ApiResponse<PagedResult<HRStaffViewModel>>> GetAllDisableStaffWithPageAsync(SearchHRStaffRequest request)
        {
            return await PostAsync<PagedResult<HRStaffViewModel>>("api/HumanResourceApi/GetAllDisableStaffWithPage", request);
        }

        public Task<ApiResponse<dynamic>> SaveDetailedPayrollAsync(HRPayrollSaveRequest req)
          => PostAsync<dynamic>("api/HumanResourceApi/SaveDetailedPayroll", req);

        public Task<ApiResponse<dynamic>> PayPayrollAsync(HRPayrollPaymentRequest req)
          => PostAsync<dynamic>("api/HumanResourceApi/PayPayroll", req);

        public Task<ApiResponse<HRPayrollDetailsViewModel>> GetPayrollDetailsAsync(int id)
            => GetAsync<HRPayrollDetailsViewModel>($"api/HumanResourceApi/GetPayrollDetails/{id}");
    }
}
