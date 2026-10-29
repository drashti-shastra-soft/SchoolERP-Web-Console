using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class PaymentTypeController : BaseController
    {
        private readonly IPaymentTypeClientService _client;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        public PaymentTypeController(IPaymentTypeClientService client,
            PermissionHelper permHelper, IConfiguration configuration, IPhotoUploadService photoService) : base(permHelper)
        {
            _client = client;
            _configuration = configuration;
            _photoService = photoService;
        }

        private async Task<PaymentTypePageViewModel> BuildPaymentTypePageViewModel(
         int? pageIndex, int? pageSize, string? search)
        {
            var model = new PaymentTypePageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/PaymentType/Index"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search
                };

                var itemVoucher = _client.GetAllPaymentTypeWithPageAsync(request);

                await Task.WhenAll(itemVoucher);

                var pagedResult = await itemVoucher;

                model = new PaymentTypePageViewModel
                {
                    PaymentType = pagedResult.Success ? pagedResult.Data.Data : new List<PaymentTypeModel>(),

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

        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search)
        {
            var model = new PaymentTypePageViewModel();
            try
            {
                model = await BuildPaymentTypePageViewModel(pageIndex, pageSize, search);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }
        // ✅ NEW — AJAX endpoint, returns only the table + pagination partial
        [HttpGet]
        public async Task<IActionResult> GetPaymentTypePartial(int? pageIndex,
        int? pageSize,
        string? search)
        {
            try
            {
                var model = await BuildPaymentTypePageViewModel(pageIndex, pageSize, search);

                return PartialView("_PaymentTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_PaymentTypeTablePartial", new PaymentTypePageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new PaymentTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/VoucherType/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditPaymentType = response.Data;
                    }
                }
                else
                {
                    model.EditPaymentType = null;
                }

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
        public async Task<IActionResult> Save([FromForm] PaymentTypeRequest req, IFormFile? attachmentFile)
        {
            try
            {
                bool isCreate = req.PaymentTypeId <= 0;
                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;
                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }
                    req.LogoUrl = attachmentFile.FileName;
                }
                else if (req.RemoveAttachment)
                {
                    // user explicitly removed the existing attachment, no new file provided
                    req.LogoUrl = null;
                }                
                var r = await _client.UpsertPaymentTypeAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? paymentTypeId = r.Data.Result.PAYMENTTYPEID;

                    if (attachmentFile != null && attachmentFile.Length > 0 && paymentTypeId.HasValue)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);
                        byte[] fileBytes = memoryStream.ToArray();

                        var photoResult = await _photoService.SaveBase64PhotoAsync(
                            Convert.ToBase64String(fileBytes),
                            attachmentFile.FileName ?? "photo.jpg",
                            PhotoModule.PaymentType,
                            FolderNameModule.Images,
                            paymentTypeId.Value
                        );

                        var attachmentReq = new PaymentTypeAttachmentUpsertRequest
                        {
                            PaymentTypeId = paymentTypeId.Value,
                            LogoUrl = photoResult.PhotoUrl
                        };
                        await _client.UpsertPaymentTypeAttachmentFileAsync(attachmentReq);
                    }
                }
                return Json(r);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

        }
    }
}
