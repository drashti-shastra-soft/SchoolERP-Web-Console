using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class ItemStockController : BaseController
    {
        private readonly IItemStockClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IItemCategoryClientService _itemCategoryclient;
        private readonly IItemSupplierClientService _itemSupplierclient;
        private readonly IItemStoreClientService _itemStoreclient;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        private readonly ICurrencyClientService _currencyClientService;
        public ItemStockController(IItemStockClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper, IItemCategoryClientService itemCategoryclient,
            IItemSupplierClientService itemSupplierclient,
            IItemStoreClientService itemStoreclient,
            IConfiguration configuration,IPhotoUploadService photoService, 
            IWebHostEnvironment environment, ICurrencyClientService currencyClientService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _itemCategoryclient = itemCategoryclient;
            _itemSupplierclient = itemSupplierclient;
            _itemStoreclient = itemStoreclient;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
            _currencyClientService = currencyClientService;
        }
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }

        private async Task<ItemStockPageViewModel> BuildItemStockPageViewModel(
          int? pageIndex, int? pageSize, string? search, int? companyId,
          int? sessionID)
        {
            var model = new ItemStockPageViewModel();
            try
            {
                var perms = await GetPermissions(
                   "/ItemCategory/Index"
               );

                var request = new SearchItemStockRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                var sessionId = await GetSessionId();
                var itemCategory = _client.GetAllItemStockWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(itemCategory, sessionTask, companiesTask);

                var pagedResult = await itemCategory;

                var getCurrency = await _currencyClientService.GetCurrencyByCompanyIdAsync(await GetCompanyId());
                

                model = new ItemStockPageViewModel
                {
                    ItemStock = pagedResult.Success ? pagedResult.Data.Data : new List<ItemStockModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    CurrencySymbol = getCurrency.Data?.CurrencySymbol
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {

                throw;
            }

        }

        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new ItemStockPageViewModel();
            try
            {
                model = await BuildItemStockPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

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
        public async Task<IActionResult> GetItemStockPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildItemStockPageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_ItemStockTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_ItemStockTablePartial", new ItemStockPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new ItemStockAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditItemStock = response.Data;
                    }
                }
                else
                {
                    model.EditItemStock = null;
                }
                var itemCategory = await _itemCategoryclient.GetItemCategorDropdownListAsync(await GetCompanyId(), await GetSessionId());
                model.ItemCategory = itemCategory.Data;
                var itemSupplier = await _itemSupplierclient.GetItemSupplierDropdownListAsync(await GetCompanyId(), await GetSessionId());
                model.ItemSupplier = itemSupplier.Data;
                var itemStore = await _itemStoreclient.GetItemByItemStoreDropdownListAsync(await GetCompanyId(), await GetSessionId());
                model.ItemStore = itemStore.Data;

                var getCurrency = await _currencyClientService.GetCurrencyByCompanyIdAsync(await GetCompanyId());
                if (getCurrency != null)
                {
                    model.CurrencySymbol = getCurrency.Data?.CurrencySymbol;
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
        public async Task<IActionResult> Save([FromForm] ItemStockModelRequest req, IFormFile? attachmentFile)
        {
            try
            {
                bool isCreate = req.ItemCategoryId <= 0;


                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }

                if (attachmentFile != null && attachmentFile.Length > 0)
                {
                    long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                    long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                    if (attachmentFile.Length > maxBytes)
                    {
                        return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                    }

                    req.FileName = attachmentFile.FileName;
                    req.FileType = attachmentFile.ContentType;

                }

                var r = await _client.UpsertItemStockAsync(req);
                if (r.Data?.Result?.Result == 1)
                {
                    int? itemStockId = r.Data.Result.ItemStockId;
                    if (attachmentFile != null && attachmentFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await attachmentFile.CopyToAsync(memoryStream);

                        byte[] fileBytes = memoryStream.ToArray();
                        PhotoUploadResult photoResult = new PhotoUploadResult();
                        if (req.FileName != null)
                        {
                            photoResult = await _photoService.SaveBase64PhotoAsync(
                                Convert.ToBase64String(fileBytes),
                                req.FileName ?? "photo.jpg",
                                PhotoModule.PostalReceive,
                                FolderNameModule.Documents,
                                itemStockId.Value
                            );
                            var attchment = new ItemStockAttachmentUpsertRequest
                            {
                                ItemStockId = itemStockId.Value,
                                Attachment = photoResult.PhotoUrl,
                                FileName = attachmentFile.FileName,
                                FileType = attachmentFile.ContentType

                            };
                            var attachment = await _client.UpsertPostalDispatchAttachmentFileAsync(attchment);
                        }
                    }
                }
                return Json(new { success = r.Data.Result, message = r.Message });
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return Json(new { success = false, message = ex.Message });
            }

       }

        [HttpGet]
        public async Task<IActionResult> GetItemByItemCategory(int itemCategoryId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var response = await _itemCategoryclient.GetItemByItemCategoryDropdownListAsync(companyId, sessionId, itemCategoryId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
