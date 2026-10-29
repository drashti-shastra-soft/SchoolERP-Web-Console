using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IVoucherTypeClientService
    {
        Task<ApiResponse<SpResult>> UpsertVoucherTypeAsync(VoucherTypeModelRequest request);
        Task<ApiResponse<VoucherTypeModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<VoucherTypeModel>>> GetAllVoucherTypeWithPageAsync(SearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetVoucherTypeDropdownListAsync();
    }
}
