using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Services.Clients
{
    public class VoucherHeaderClientService : BaseApiClient, IVoucherHeaderClientService
    {
        public VoucherHeaderClientService(HttpClient client) : base(client) { }
        public async Task<ApiResponse<VoucherSaveFullResult>> UpsertVoucherHeaderAsync(VoucherHeaderRequest request)
        {
            return await PostAsync<VoucherSaveFullResult>("api/VoucherHeaderAPI/Save", request);
        }

        public async Task<ApiResponse<VoucherHeaderFullResult>> GetByIDAsync(int id)
        {
            return await GetAsync<VoucherHeaderFullResult>($"api/VoucherHeaderAPI/GetById/{id}");
        }

        public async Task<ApiResponse<PagedResult<VoucherHeaderModel>>> GetAllVoucherHeaderWithPageAsync(VoucherHeaderSearchRequest request)
        {
            return await PostAsync<PagedResult<VoucherHeaderModel>>("api/VoucherHeaderAPI/GetAllVoucherHeaderWithPage", request);
        }

        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/VoucherHeaderAPI/Delete", ids);
        }

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VoucherHeaderAPI/ToggleStatus", request);
        }

        #region Voucher Header Value
        public async Task<ApiResponse<SpResult>> UpsertVoucherHeaderValueAsync(VoucherHeaderValueRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherHeaderAPI/UpsertVoucherHeaderValue", request);
        }

        public async Task<ApiResponse<List<VoucherHeaderValue>>> GetVoucherHeaderValueListAsync(int companyID, int sessionID, int fieldID, bool? isActive)
        {
            return await GetAsync<List<VoucherHeaderValue>>(
                $"api/VoucherHeaderAPI/GetVoucherHeaderValueList?companyID={companyID}&sessionID={sessionID}&isActive={isActive}");
        }

        public async Task<ApiResponse<VoucherHeaderModel>> GetVoucherHeaderValueByIdAsync(int id)
        {
            return await GetAsync<VoucherHeaderModel>($"api/GetVoucherHeaderValueById/GetById/{id}");
        }
        #endregion

        #region Voucher Details
        public async Task<ApiResponse<SpResult>> UpsertVoucherDetailAsync(VoucherDetailRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherHeaderAPI/UpsertVoucherDetail", request);
        }

        public async Task<ApiResponse<List<VoucherDetail>>> GetVoucherDetailListAsync(int companyID, int sessionID, int voucherHeaderID, bool? isActive)
        {
            return await GetAsync<List<VoucherDetail>>(
                $"api/VoucherHeaderAPI/GetVoucherDetailList?companyID={companyID}&sessionID={sessionID}&voucherHeaderID={voucherHeaderID}&isActive={isActive}");
        }

        public async Task<ApiResponse<VoucherHeaderModel>> GetVoucherDetailByIdAsync(int id)
        {
            return await GetAsync<VoucherHeaderModel>($"api/GetVoucherDetailById/GetById/{id}");
        }
        #endregion

        #region Voucher Details Values
        public async Task<ApiResponse<SpResult>> UpsertVoucherDetailValueAsync(VoucherDetailValueRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherHeaderAPI/UpsertVoucherDetailValue", request);
        }

        public async Task<ApiResponse<List<VoucherDetailValue>>> GetVoucherDetailListAsync(VoucherValueSearchRequest request)
        {
            return await PostAsync<List<VoucherDetailValue>>(
                $"api/VoucherHeaderAPI/GetVoucherDetailList", request);
        }

        public async Task<ApiResponse<VoucherDetailValue>> GetVoucherDetailValueByIdAsync(int id)
        {
            return await GetAsync<VoucherDetailValue>($"api/GetVoucherDetailValueById/GetById/{id}");
        }
        #endregion

        public async Task<ApiResponse<VoucherSaveFullResult>> SaveVoucherAsync(VoucherSaveFullRequest request)
        {
            return await PostAsync<VoucherSaveFullResult>("api/VoucherHeaderAPI/SaveVoucher", request);
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetStaffDropdownListAsync(int companyID, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/VoucherHeaderAPI/GetStaffDropdownList?companyID={companyID}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<List<DropdownModel>>> GetStudentsDropdownListAsync(int companyID, int sessionId)
        {
            return await GetAsync<List<DropdownModel>>(
                $"api/VoucherHeaderAPI/GetStudentsDropdownList?companyID={companyID}&sessionId={sessionId}");
        }

        public Task<ApiResponse<dynamic>> UpsertVoucherHeaderAttachmentFileAsync(VoucherHeaderAttachmentUpsertRequest req)
           => PostAsync<dynamic>("api/VoucherHeaderAPI/UpsertVoucherHeaderAttachmentFile", req);

        public async Task<ApiResponse<List<VoucherDetailClearingResponse>>> GetForClearingAsync(VoucherBankClearingRequest req)
        {
            return await PostAsync<List<VoucherDetailClearingResponse>>(
                $"api/VoucherHeaderAPI/GetForClearing",req);
        }
        public async Task<ApiResponse<SpResult>> SaveVoucherClearingAsync(VoucherBankClearingSaveRequest request)
        {
            return await PostAsync<SpResult>("api/VoucherHeaderAPI/SaveVoucherClearing", request);
        }
    }
}
