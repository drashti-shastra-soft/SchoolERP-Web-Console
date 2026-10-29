using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IVoucherFieldOptionClientService
    {
        Task<ApiResponse<SpResult>> UpsertVoucherFieldOptionAsync(VoucherFieldOptionRequest request);
        Task<ApiResponse<VoucherFieldOptionModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<VoucherFieldOptionModel>>> GetAllVoucherFieldOptionWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<VoucherFieldOptionResponse>>> GetLinkedOptionsAsync(int fieldId,
    string optionValue,
    int? companyId,
    int? sessionId);
    }
}
