using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IVoucherHeaderClientService
    {
        Task<ApiResponse<VoucherSaveFullResult>> UpsertVoucherHeaderAsync(VoucherHeaderRequest request);
        Task<ApiResponse<VoucherHeaderFullResult>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<VoucherHeaderModel>>> GetAllVoucherHeaderWithPageAsync(VoucherHeaderSearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);

        #region Voucher Header Value
        Task<ApiResponse<SpResult>> UpsertVoucherHeaderValueAsync(VoucherHeaderValueRequest request);
        Task<ApiResponse<List<VoucherHeaderValue>>> GetVoucherHeaderValueListAsync(int companyID, int sessionID, int fieldID, bool? isActive);
        Task<ApiResponse<VoucherHeaderModel>> GetVoucherHeaderValueByIdAsync(int id);
        #endregion

        #region Voucher Details
        Task<ApiResponse<SpResult>> UpsertVoucherDetailAsync(VoucherDetailRequest request);
        Task<ApiResponse<List<VoucherDetail>>> GetVoucherDetailListAsync(int companyID, int sessionID, int voucherHeaderID, bool? isActive);
        Task<ApiResponse<VoucherHeaderModel>> GetVoucherDetailByIdAsync(int id);
        #endregion

        #region Voucher Details Values
        Task<ApiResponse<SpResult>> UpsertVoucherDetailValueAsync(VoucherDetailValueRequest request);
        Task<ApiResponse<List<VoucherDetailValue>>> GetVoucherDetailListAsync(VoucherValueSearchRequest request);
        Task<ApiResponse<VoucherDetailValue>> GetVoucherDetailValueByIdAsync(int id);
        #endregion

        Task<ApiResponse<VoucherSaveFullResult>> SaveVoucherAsync(VoucherSaveFullRequest request);
        Task<ApiResponse<List<DropdownModel>>> GetStaffDropdownListAsync(int companyID, int sessionId);
        Task<ApiResponse<List<DropdownModel>>> GetStudentsDropdownListAsync(int companyID, int sessionId);

        Task<ApiResponse<dynamic>> UpsertVoucherHeaderAttachmentFileAsync(VoucherHeaderAttachmentUpsertRequest req);
        Task<ApiResponse<List<VoucherDetailClearingResponse>>> GetForClearingAsync(VoucherBankClearingRequest req);
        Task<ApiResponse<SpResult>> SaveVoucherClearingAsync(VoucherBankClearingSaveRequest request);
    }
}
