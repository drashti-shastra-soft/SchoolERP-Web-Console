using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeOpeningBalanceClientService
    {
        Task<ApiResponse<StudentFeeOpeningBalanceResponse>> GetRowsAsync(StudentFeeOpeningBalanceGetRequest request);
        Task<ApiResponse<StudentFeeOpeningBalanceSaveResponse>> SaveAsync(StudentFeeOpeningBalanceSaveRequest request);
        Task<ApiResponse<List<PositionOfStudentFeeResponse>>> GetPositionOfStudentFeeAsync(PositionOfStudentFeeRequest request);
        Task<ApiResponse<List<FeeInstallmentDropdownResponse>>> GetInstallmentDropdownAsync(int companyId, int sessionId);
    }
}
