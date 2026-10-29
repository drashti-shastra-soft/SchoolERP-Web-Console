using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IHumanResourceClientService
    {
        Task<ApiResponse<List<HRDesignationViewModel>>> GetAllDesignationsAsync(int companyId, int sessionId);
        Task<ApiResponse<HRDesignationViewModel>> GetDesignationByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertDesignationAsync(HRDesignationUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteDesignationAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleDesignationStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleDesignationStatusAsync(StatusUpdateRequest request);

        Task<ApiResponse<DepartmentListResponse>> GetAllDepartmentsAsync(int companyId, int sessionId);
        Task<ApiResponse<HRDepartmentViewModel>> GetDepartmentByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertDepartmentAsync(HRDepartmentUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteDepartmentAsync(List<int> id);
        //Task<ApiResponse<dynamic>> ToggleDepartmentStatusAsync(int id, bool isActive);
        Task<ApiResponse<dynamic>> ToggleDepartmentStatusAsync(StatusUpdateRequest request);

        Task<ApiResponse<List<HRLeaveTypeViewModel>>> GetAllLeaveTypesAsync(int sessionID, int companyId);
        Task<ApiResponse<HRLeaveTypeViewModel>> GetLeaveTypeByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertLeaveTypeAsync(HRLeaveTypeUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteLeaveTypeAsync(List<int> id);
        Task<ApiResponse<dynamic>> ToggleLeaveTypeStatusAsync(StatusUpdateRequest request);

        Task<ApiResponse<List<HRStaffViewModel>>> GetAllStaffAsync(int companyId, int sessionId, int? staffId=null);
        Task<ApiResponse<HRStaffViewModel>> GetStaffByIDAsync(int id);
        Task<ApiResponse<SpResult>> UpsertStaffAsync(HRStaffUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteStaffAsync(List<int> id);
        Task<ApiResponse<string>> GetNewStaffCodeAsync(int companyId, int sessionId);
        Task<ApiResponse<List<StaffDashboardDto>>> GetStaffDashboardAsync();


        Task<ApiResponse<List<HRStaffAttendanceViewModel>>> GetStaffAttendanceAsync(DateTime date, int? roleId);
        Task<ApiResponse<dynamic>> SaveStaffAttendanceAsync(HRStaffAttendanceUpsertRequestModel reqs);
        Task<ApiResponse<PagedResult<HRStaffAttendanceViewModel>>> GetAllStaffAttendanceWithPageAsync(HRStaffAttendanceSearchRequest request);
        // --- Apply Leave ---
        Task<ApiResponse<List<HRApplyLeaveViewModel>>> GetAllApplyLeaveAsync();
        Task<ApiResponse<HRApplyLeaveViewModel>> GetApplyLeaveByIDAsync(int id);
        Task<ApiResponse<dynamic>> UpsertApplyLeaveAsync(HRApplyLeaveUpsertRequest req);
        Task<ApiResponse<dynamic>> DeleteApplyLeaveAsync(List<int> id);
        
        // --- Payroll ---
        Task<ApiResponse<List<HRPayrollViewModel>>> GetAllPayrollAsync(int month, int year, int? roleId);
        Task<ApiResponse<dynamic>> GeneratePayrollAsync(HRPayrollGenerateRequest req);

        Task<ApiResponse<HttpResponseMessage>> GetStaffDocumentAsync(
            int staffId,
            string docType);

        Task<ApiResponse<HttpResponseMessage>> GetApplyLeaveDocumentAsync(int id);
        Task<ApiResponse<HRPayrollGenerationViewModel>> GetPayrollGenerationDataAsync(
            int staffId,
            int month,
            int year, int companyId, int sessionId);

        Task<ApiResponse<dynamic>> UpdateProfileAsync(ProfileRequest req);


        Task<ApiResponse<PagedResult<HRDepartmentViewModel>>> GetAllDepartmentsWithPageAsync(SearchRequest request);
        Task<ApiResponse<PagedResult<HRDesignationViewModel>>> GetAllDesignationsWithPageAsync(SearchRequest request);
        Task<ApiResponse<PagedResult<HRLeaveTypeViewModel>>> GetAllLeaveTypesWithPageAsync(SearchRequest request);

        Task<ApiResponse<LeaveQuotaModel>> GetLeaveTypeWiseBalanceAsync(int leaveTypeId, int staffId);
        Task<ApiResponse<PagedResult<HRApplyLeaveViewModel>>> GetAllApplyLeaveWithPageAsync(SearchRequest request);
        Task<ApiResponse<StaffAttendanceSummaryModel>> GetStaffAttendanceSummaryAsync(
            int companyId, int sessionId, int staffId, int? year = null, int? status = null);
        Task<ApiResponse<HRStaffTimelineViewModel>> GetTimelineByIDsync(int id);
        Task<ApiResponse<UpsertStaffTimelineResponse>> UpsertTimelineAsync(
            HRStaffTimelineUpsertRequest request);
        Task<ApiResponse<dynamic>> UpsertStaffTimelineAttachmentFileAsync(StudentTimelineAttachmentUpsertRequest req);
        Task<ApiResponse<List<HRStaffTimelineViewModel>>> GetStaffTimelineAsync(int staffId);
        Task<ApiResponse<object>> DeleteTimelineAsyc(int id);

        Task<ApiResponse<dynamic>> ToggleStaffStatusAsync(HRStaffStatusToggleRequest request);
        Task<ApiResponse<dynamic>> ChangeStaffPasswordAsync(HRStaffChangePasswordRequest request);
        Task<ApiResponse<PagedResult<HRStaffViewModel>>> GetAllStaffWithPageAsync(SearchHRStaffRequest request);
        Task<ApiResponse<PagedResult<HRStaffViewModel>>> GetAllDisableStaffWithPageAsync(SearchHRStaffRequest request);

        Task<ApiResponse<dynamic>> SaveDetailedPayrollAsync(HRPayrollSaveRequest req);
        Task<ApiResponse<dynamic>> PayPayrollAsync(HRPayrollPaymentRequest req);
        Task<ApiResponse<HRPayrollDetailsViewModel>> GetPayrollDetailsAsync(int id);
    }
}
