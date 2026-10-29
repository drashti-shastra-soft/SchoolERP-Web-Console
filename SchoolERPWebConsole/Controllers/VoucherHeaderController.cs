using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;
using System.Threading.Tasks;

namespace SchoolERPWebClient.Controllers
{
    public class VoucherHeaderController : BaseController
    {
        private readonly IVoucherHeaderClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly IVoucherTypeClientService _clientVoucherType;
        private readonly IVoucherTypeFieldClientService _clientVoucherTypeField;
        private readonly ISessionClientService _sessionService;
        private readonly ICostCenterClientService _costCenterService;
        private readonly IAccountHeadClientService _accountHeadClient;
        private readonly IVoucherFieldOptionClientService _voucherFieldOptionClient;
        private readonly IHumanResourceClientService _hrClient;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        public VoucherHeaderController(
            IVoucherHeaderClientService client,
            PermissionHelper permHelper,
            IVoucherTypeClientService clientVoucherType,
            ICompanyClientService companyService,
            IVoucherTypeFieldClientService clientVoucherTypeField,
            ISessionClientService sessionService,
            ICostCenterClientService costCenterService,
            IAccountHeadClientService accountHeadClient,
            IVoucherFieldOptionClientService voucherFieldOptionClient,
            IHumanResourceClientService hrClient, IConfiguration configuration,
            IPhotoUploadService photoService, IWebHostEnvironment environment) : base(permHelper)
        {
            _client = client;
            _clientVoucherType = clientVoucherType;
            _companyService = companyService;
            _clientVoucherTypeField = clientVoucherTypeField;
            _sessionService = sessionService;
            _costCenterService = costCenterService;
            _accountHeadClient = accountHeadClient;
            _voucherFieldOptionClient = voucherFieldOptionClient;
            _hrClient = hrClient;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
        }

        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == default(int))
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }
        private async Task<VoucherHeaderPageViewModel> BuildVoucherHeaderPageViewModel(
       int? pageIndex, int? pageSize, string? search)
        {
            var model = new VoucherHeaderPageViewModel();
            try
            {
                var perms = await GetPermissions("/VoucherTypeField/Index");

                var request = new VoucherHeaderSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };

                var itemVoucher = _client.GetAllVoucherHeaderWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new VoucherHeaderPageViewModel
                {
                    VoucherHeader = pagedResult.Success ? pagedResult.Data.Data : new List<VoucherHeaderModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search
                };

                model.Permissions = perms;
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }
        }

        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search)
        {
            var model = new VoucherHeaderPageViewModel();
            try
            {
                model = await BuildVoucherHeaderPageViewModel(pageIndex, pageSize, search);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        // AJAX endpoint — returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetVoucherHeaderPartial(int? pageIndex, int? pageSize, string? search)
        {
            try
            {
                var model = await BuildVoucherHeaderPageViewModel(pageIndex, pageSize, search);
                return PartialView("_VoucherHeaderTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_VoucherHeaderTablePartial", new VoucherHeaderPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new VoucherHeaderAddViewModel();
            try
            {
                // this controller's own Add page, not the parent VoucherType module.
                var perms = await GetPermissions("/Add");

                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                
                var staff = await _client.GetStaffDropdownListAsync(companyId, sessionId);
                var students = await _client.GetStudentsDropdownListAsync(companyId, sessionId);
                // the dropdown here must list voucher types
                var voucherType = await _clientVoucherType.GetVoucherTypeDropdownListAsync();
                var costCenter = await _costCenterService.GetCostCenterDropdownListAsync(companyId, sessionId);
                
                
                if (id.HasValue && id.Value > 0)
                {
                    // TODO: once available, switch this to a "GetFullByIdAsync" call backed
                    // by SP_VoucherHeader_GetFullById, so EditVoucherHeader also carries the
                    // Details + DetailValues lists needed to hydrate the details grid
                    // (see window.voucherDetailRows / window.voucherDetailValues in Add.cshtml).
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditVoucherHeader = response.Data;
                        model.DynamicFieldValues = response?.Data.DynamicFieldValues ?? new();
                    }
                }
                else
                {
                    model.EditVoucherHeader = null;
                }

                model.Staffs = staff.Data;
                model.Students = students.Data;
                model.CostCenters = costCenter.Data;
                model.VoucherTypes = voucherType.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                var response = await _client.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _client.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] VoucherHeaderRequest req)
        {

            if (req.VoucherHeaderID <= 0)
                return Json(new { success = false, message = "Please select a voucher type." });

            // CompanyID is always stamped server-side — never trust a value
            // the client might send for this.
            req.CompanyID = await GetCompanyId();

            try
            {
                var r = await _client.UpsertVoucherHeaderAsync(req);

                if (r?.Data == null)
                    return Json(new { success = false, message = "No response received from the server." });

                return Json(new
                {
                    success = r.Data.Result,
                    message = r.Data.Result,
                    voucherHeaderId = r.Data.VOUCHERHEADERID   // needed for step 2
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // STEP 2 — Upload attachment, called only after Step 1 succeeds and returns an ID.
        [HttpPost]
        public async Task<IActionResult> UploadAttachment(
            [FromForm] int voucherHeaderId,
            [FromForm] IFormFile attachmentFile)
        {
            if (voucherHeaderId <= 0)
                return Json(new { success = false, message = "Invalid voucher header." });

            if (attachmentFile == null || attachmentFile.Length == 0)
                return Json(new { success = false, message = "No file provided." });

            long maxMb = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
            long maxBytes = maxMb * 1024L * 1024L;

            if (attachmentFile.Length > maxBytes)
                return Json(new { success = false, message = $"File size exceeds the {maxMb} MB limit." });

            try
            {
                using var memoryStream = new MemoryStream();
                await attachmentFile.CopyToAsync(memoryStream);
                byte[] fileBytes = memoryStream.ToArray();

                var photoResult = await _photoService.SaveBase64PhotoAsync(
                    Convert.ToBase64String(fileBytes),
                    attachmentFile.FileName,
                    PhotoModule.Account,       // adjust to your actual enum
                    FolderNameModule.Account,  // adjust to your actual enum
                    voucherHeaderId
                );

                var attachmentReq = new VoucherHeaderAttachmentUpsertRequest // adjust to your actual request type
                {
                    VoucherHeaderID = voucherHeaderId,
                    Attachment = photoResult.PhotoUrl,
                    FileName = attachmentFile.FileName,
                    FileType = attachmentFile.ContentType
                };

                await _client.UpsertVoucherHeaderAttachmentFileAsync(attachmentReq); // adjust to your actual client call

                return Json(new { success = true, message = "Attachment uploaded successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetDynamicFields(int voucherId)
        {
            try
            {
                // This client method should call:
                // GET /api/Voucher/dynamic-fields?companyId={companyId}&voucherId={voucherId}&sessionId={sessionId}
                //
                // If your MVC application gets CompanyID from session/user,
                // pass that value here instead of taking it from the browser.
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _clientVoucherTypeField.GetVoucherDynamicFieldsAsync(
                    companyId,
                    voucherId, sessionId);

                if (response == null)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Unable to load voucher fields."
                    });
                }

                return Json(new
                {
                    success = true,
                    data = response
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // ------------------------------------------------------------
        // Account Name dropdown for the Voucher Details grid.
        //
        // Backed by dbo.USP_GetMasterTableOptions against
        // dbo.vw_ACC_AccountHead_Options (AccountID / AccountDisplayName),
        // same generic master-table lookup mechanism as any other
        // MASTER_TABLE-sourced dynamic field - Account Head is just
        // called directly here since AccID is a fixed VoucherDetail
        // column rather than a per-voucher-type dynamic field.
        //
        // TODO: add GetAccountHeadOptionsAsync(companyId, sessionId) to
        // IVoucherHeaderClientService (or a small dedicated client
        // service) on the API side, returning { id, name } pairs from
        // that view.
        // ------------------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetAccountHeadOptions()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var response = await _accountHeadClient.GetAccountParentDropdownListAsync(null,companyId, sessionId);

                if (response == null || !response.Success)
                {
                    return Json(new
                    {
                        success = false,
                        message = response?.Message ?? "Unable to load account list."
                    });
                }

                return Json(new
                {
                    success = true,
                    data = response.Data
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveFull([FromBody] VoucherSaveFullRequest req)
        {

            if (req.VoucherId <= 0)
                return Json(new { success = false, message = "Please select a voucher type." });

            // CompanyID and SessionID are always stamped server-side —
            // never trust values the client might send for these.
            req.CompanyID = await GetCompanyId();
            req.SessionID = await GetSessionId();

            try
            {
                var r = await _client.SaveVoucherAsync(req);

                if (r?.Data == null)
                    return Json(new { success = false, message = "No response received from the server." });

                return Json(new
                {
                    success = r.Data.Result,
                    message = r.Data.Message,
                    voucherHeaderId = r.Data.VOUCHERHEADERID   // needed for step 2
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStaffList()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var staff = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                return Json(new { success = true, data = staff }); // [{OptionValue, OptionLabel}, ...]
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> GetStudentList()
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var staff = await _hrClient.GetAllStaffAsync(companyId, sessionId, staffId);
                return Json(new { success = true, data = staff }); // [{OptionValue, OptionLabel}, ...]
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Displays the main Bank Clearing page with the list already loaded for the
        /// given filters (or empty/defaulted on first load).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> BankClearing(VoucherBankClearingRequest request)
        {
            var model = new BankClearingAddViewModel();
            try
            {
                var perms = await GetPermissions("/VoucherHeader/BankClearing");
                
                model = await BuildAccountBankClearingViewModel(request);
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the clearing table (AJAX endpoint) —
        /// called on Search and after a successful Save.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAccountBankClearingPartial(VoucherBankClearingRequest request)
        {
            try
            {
                var model = await BuildAccountBankClearingViewModel(request);
                return PartialView("_AccountBankClearingTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return PartialView("_AccountBankClearingTablePartial", new BankClearingAddViewModel());
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveVoucherClearing([FromBody] VoucherBankClearingSaveRequest model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                model.UserId = GetCurrentUserId();
                model.CompanyID = model.CompanyID > 0 ? model.CompanyID : await GetCompanyId();
                if (string.IsNullOrWhiteSpace(model.IPAddress))
                    model.IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                var spResult = await _client.SaveVoucherClearingAsync(model);

                return Ok(spResult);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<SpResult>
                {
                    Success = false,
                    Message = "Unable to save payment type. Please try again.",
                    Data = null
                });
            }
        }

        // ------------------------------------------------------------
        // Shared builder — used by both the full page load and the
        // partial AJAX reload, so filters/results never drift apart.
        // ------------------------------------------------------------
        private async Task<BankClearingAddViewModel> BuildAccountBankClearingViewModel(VoucherBankClearingRequest request)
        {
            var companyId = await GetCompanyId();
            var perms = await GetPermissions("/VoucherTypeField/Add");
            var model = new BankClearingAddViewModel
            {

                Permissions = perms, // reuse your existing permission loader
                BankFieldValue = request.BankFieldValue,
                DateFrom = request.DateFrom == default ? DateTime.Today.AddDays(1 - DateTime.Today.Day) : request.DateFrom,
                DateTo = request.DateTo == default ? DateTime.Today : request.DateTo,
                Cleared = request.Cleared
            };
            var response = await _accountHeadClient.GetAccountParentDropdownListAsync(null, companyId, await GetSessionId());

            model.Banks = response.Data;

            // Only hit the SP once a bank is actually selected — first page load
            // with no filter shouldn't run a query at all.
            if (model.BankFieldValue > 0)
            {
                request.CompanyID = companyId;
                request.DateFrom = model.DateFrom.Value;
                request.DateTo = model.DateTo.Value;
                var resRow = await _client.GetForClearingAsync(request);

                model.Rows = resRow.Data;
            }

            var total = model.Rows.Sum(r => r.Amount);
            model.UnclearedTotal = model.Cleared ? 0 : total;
            model.ClearedTotal = model.Cleared ? total : 0;
            model.GrandTotal = total;

            return model;
        }        
    }
}