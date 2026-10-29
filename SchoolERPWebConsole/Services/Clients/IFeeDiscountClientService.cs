using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IFeeDiscountClientService
    {
        Task<ApiResponse<List<DropdownModel>>> GetConcessionsAsync(int companyId);
        Task<ApiResponse<List<DropdownModel>>> GetDiscountByUsersAsync(int companyId);
        Task<ApiResponse<List<StudentFeeDiscountRowResponse>>> GetRowsAsync(int studentId, int companyId, int sessionId);
        Task<ApiResponse<StudentFeeDiscountHeaderResponse?>> GetHeaderAsync(StudentFeeDiscountHeaderRequest request);
        Task<ApiResponse<StudentFeeDiscountSaveResponse>> SaveAsync(StudentFeeDiscountSaveRequest request);
    }
}
