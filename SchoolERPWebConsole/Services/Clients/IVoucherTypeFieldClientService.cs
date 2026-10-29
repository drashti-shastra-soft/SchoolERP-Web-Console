using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IVoucherTypeFieldClientService
    {
        Task<ApiResponse<SpResult>> UpsertVoucherTypeFieldAsync(VoucherFieldRequest request);
        Task<ApiResponse<VoucherTypeFieldModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<VoucherTypeFieldModel>>> GetAllVoucherTypeFielddWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetVoucherTypeFieldDropdownListAsync(int companyID);
        Task<ApiResponse<List<VoucherDynamicFieldResponse>>> GetVoucherDynamicFieldsAsync(int companyId, int voucherId,int sessionId);
    }
}
