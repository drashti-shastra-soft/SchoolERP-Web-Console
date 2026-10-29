using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Text.Json;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// Controller for managing Room Cooling Types (e.g., AC, Non-AC) used in hostels.
    /// Provides endpoints for listing, adding, editing, deleting, and toggling status of room cooling types.
    /// </summary>
    public class RoomTypeController : BaseController
    {
        private readonly IHostelClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IRoomCoolingTypeClientService _roomCoolingTypeService;
        public RoomTypeController(IHostelClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper, IRoomCoolingTypeClientService roomCoolingTypeService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _roomCoolingTypeService = roomCoolingTypeService;
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
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }


        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new RoomCoolingTypePageViewModel();
            try
            {
                model = await BuildRoomTypeViewModel(
                    pageIndex, pageSize, search,  companyId, sessionID);

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
        public async Task<IActionResult> GetRoomTypePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildRoomTypeViewModel(
                    pageIndex, pageSize, search,  companyId, sessionID);

                return PartialView("_RoomTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_RoomTypeTablePartial", new MstSubjectPageViewModel());
            }
        }

        /// <summary>
        /// Shows the 'HostelType' management page where you can define the different grades or Hostel Type in the school.
        /// </summary>
        public async Task<RoomCoolingTypePageViewModel> BuildRoomTypeViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new RoomCoolingTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/RoomType/Index"
               );

                var request = new ClassSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                var response =  _roomCoolingTypeService.GetAllRoomCoolingTypeWithPageAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(response,sessionTask, companiesTask);
                var pagedResult = await response;
                model = new RoomCoolingTypePageViewModel
                {
                    RoomCoolingType = pagedResult.Success ? pagedResult.Data.Data : new List<RoomCoolingType>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    Permissions = perms
                };
                
                return model;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new RoomCoolingTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/RoomType/Index"
               );
               
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _roomCoolingTypeService.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.RoomCoolingType = response.Data;
                        model.EditRoomCoolingType = response.Data;
                    }
                }
                else
                {
                    model.EditRoomCoolingType = null;
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
        public async Task<IActionResult> Save([FromBody] RoomCoolingTypeListDto request)
        {
            try
            {
                var isCreate = request.RoomCoolingTypeId <= 0;               
                
                if(request.SessionID==0 || request.SessionID == null) 
                {
                    request.SessionID = await GetSessionId();
                }
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _roomCoolingTypeService.UpsertRoomCoolingTypeAsync(request);
                object dataObj = response?.Data;   //  forces static binding, no dynamic operator resolution

                if (dataObj is JsonElement dataElement
                    && dataElement.ValueKind != JsonValueKind.Null
                    && dataElement.ValueKind != JsonValueKind.Undefined)
                {
                    var result = dataElement.TryGetProperty("result", out var resultProp) ? resultProp.GetInt32() : 0;
                    var message = dataElement.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown response.";
                    return Json(new { success = result == 1, message = message });
                }
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                var response = await _roomCoolingTypeService.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> ToggleStatusChange([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _roomCoolingTypeService.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
