using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Text.Json;

namespace SchoolERPWebConsole.Controllers
{
    public class HostelController : BaseController
    {
        private readonly IHostelClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IHostelTypeClientService _hostelTypeService;
        private readonly IRoomCoolingTypeClientService _roomCoolingTypeService;
        private readonly IPostalCodeClienService _postalCodeService;
        private readonly ICityClientService _cityService;
        private readonly IStateClientService _stateService;
        private readonly ICountryClientService _countryService;

        public HostelController(IHostelClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper,
            IHostelTypeClientService hostelTypeService,
            IRoomCoolingTypeClientService roomCoolingTypeService, IPostalCodeClienService postalCodeService,
            ICityClientService cityClientService,
            IStateClientService stateClientService,
            ICountryClientService countryClientService) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
            _hostelTypeService = hostelTypeService;
            _roomCoolingTypeService = roomCoolingTypeService;
            _postalCodeService = postalCodeService;
            _cityService = cityClientService;
            _stateService = stateClientService;
            _countryService = countryClientService;
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

        /// <summary>
        /// Shows a paginated list of all available room types in the system.
        /// Use this to view, search, and filter different room types for hostels.
        /// Useful for administrators to manage and review room type options.
        /// </summary>
        public async Task<RoomTypePageViewModel> BuildRoomOccupancyTypeViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new RoomTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/RoomType"
               );

                var request = new ClassSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };


                // Step 1: Ask the system to fetch the full list of room types.
                var roomTypeRes = _client.GetAllRoomTypeWithPageAsync(request);


                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(roomTypeRes, sessionTask, companiesTask);

                var pagedResult = await roomTypeRes;
                // Step 2: Organize the data found or provide an empty list if nothing was retrieved.
                model = new RoomTypePageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<RoomTypeViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;
                // Step 3: Send the room type information to the display page.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }

        }



        public async Task<IActionResult> RoomType(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new RoomTypePageViewModel();
            try
            {
                model = await BuildRoomOccupancyTypeViewModel(
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
        public async Task<IActionResult> GetRoomOccupancyTypePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildRoomOccupancyTypeViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_RoomOccupancyTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_RoomOccupancyTypeTablePartial", new MstSubjectPageViewModel());
            }
        }

        /// <summary>
        /// Displays the main hostel management page with a paginated list of all hostels and their room types.
        /// Use this to view, search, and filter hostels. Also provides access to room type information.
        /// Ideal for administrators managing hostel infrastructure.
        /// </summary>


        public async Task<IActionResult> Index(int? pageIndex,
        int? pageSize,
        string? search,
        int? roomTypeID,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelPageViewModel();
            try
            {
                model = await BuildHostelPageViewModel(
                    pageIndex, pageSize, search, roomTypeID, companyId, sessionID);

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
        public async Task<IActionResult> GetHostelPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? roomTypeID,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildHostelPageViewModel(
                    pageIndex, pageSize, search, roomTypeID, companyId, sessionID);

                return PartialView("_HostelTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_HostelTablePartial", new MstSubjectPageViewModel());
            }
        }

        // ✅ NEW — shared logic extracted from the original Subject() action, unchanged internally
        private async Task<HostelPageViewModel> BuildHostelPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? roomTypeID,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/Index"
               );

                var request = new HotelSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    RoomTypeID = roomTypeID ?? 0,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                // Step 1: Gather information about all hostels and room types from the system.
                var resHostel = _client.GetAllHotelWithPageAsync(request);
                var resRoomType = await _hostelTypeService.GetAllAsync(request.CompanyID, request.SessionID);


                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(resHostel, sessionTask, companiesTask);

                var pagedResult = await resHostel;

                // Step 2: Prepare the data for the screen, handling cases where data might be missing.
                model = new HostelPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<HostelViewModel>(),
                    RoomTypes = resRoomType.Success ? resRoomType.Data : new List<HostelTypeModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;
                // Step 3: Present the dashboard to the user.
                return model;
            }
            catch (Exception)
            {

                throw;
            }

        }



        /// <summary>
        /// Shows a paginated list of hostel rooms, including which hostel and room type each belongs to.
        /// Use this to manage, search, and filter hostel rooms for assignments or audits.
        /// </summary>
        public async Task<HostelRoomPageViewModel> BuildHostelRoomPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? hostelID,
        int? roomTypeID,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelRoomPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/HostelRoom"
               );

                var request = new HotelSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    HostelID = hostelID ?? 0,
                    RoomTypeID = roomTypeID ?? 0,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                // Step 1: Retrieve all room records, hostel names, and category types.

                // Step 1: Gather information about all hostels and room types from the system.
                var resRoom = _client.GetAllHostelRoomWithPageAsync(request);
                var resRoomType = await _client.GetAllRoomTypesAsync(false, request.SessionID, request.CompanyID);
                var resHostel = await _client.GetAllHostelsAsync(false, request.SessionID, request.CompanyID);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(resRoom, sessionTask, companiesTask);

                var pagedResult = await resRoom;

                model = new HostelRoomPageViewModel
                {
                    Items = pagedResult.Success ? pagedResult.Data.Data : new List<HostelRoomViewModel>(),
                    Hostels = resHostel.Success ? resHostel.Data : new List<HostelViewModel>(),
                    RoomTypes = resRoomType.Success ? resRoomType.Data : new List<RoomTypeViewModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
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


        public async Task<IActionResult> HostelRoom(int? pageIndex,
        int? pageSize,
        string? search,
        int? hostelID,
        int? roomTypeID,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelRoomPageViewModel();
            try
            {
                model = await BuildHostelRoomPageViewModel(
                    pageIndex, pageSize, search, hostelID, roomTypeID, companyId, sessionID);

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
        public async Task<IActionResult> GetHostelRoomPartial(int? pageIndex, int? pageSize, string? search, int? hostelID, int? roomTypeID, int? companyId, int? sessionID)
        {
            try
            {
                var model = await BuildHostelRoomPageViewModel(
                    pageIndex, pageSize, search, hostelID, roomTypeID, companyId, sessionID);

                return PartialView("_HostelHostelRoomTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_HostelHostelRoomTablePartial", new MstSubjectPageViewModel());
            }
        }

        #region Room Type API Endpoints
        /// <summary>
        /// Retrieves a room type by its unique ID.
        /// Use this to fetch details for editing or displaying a specific room type.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRoomTypeByID(int id)
        {
            try
            {
                var res = await _client.GetRoomTypeByIDAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Creates or updates a room type.
        /// Use this to add a new room type or modify an existing one. Ensures session and company context is set.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertRoomType([FromBody] RoomTypeUpsertRequest req)
        {
            try
            {

                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                var res = await _client.UpsertRoomTypeAsync(req);
                object dataObj = res?.Data;   // forces static binding, no dynamic operator resolution

                if (dataObj is JsonElement dataElement
                    && dataElement.ValueKind != JsonValueKind.Null
                    && dataElement.ValueKind != JsonValueKind.Undefined)
                {
                    var result = dataElement.TryGetProperty("result", out var resultProp) ? resultProp.GetInt32() : 0;
                    var message = dataElement.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown response.";
                    return Json(new { success = result == 1, message = message });
                }
                return Json(new { success = res.Success, message = res.Message });

            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more room types by their IDs.
        /// Use this to remove room types that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteRoomType([FromBody] List<int> id)
        {
            try
            {
                var res = await _client.DeleteRoomTypeAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Toggles the active status of one or more room types (activate/deactivate).
        /// Use this to enable or disable room types without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleRoomTypeStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _client.ToggleRoomTypeStatusAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Hostel API Endpoints

        /// <summary>
        /// Retrieves a hostel by its unique ID.
        /// Use this to fetch details for editing or displaying a specific hostel.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHostelByID(int id)
        {
            try
            {
                var res = await _client.GetHostelByIDAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Creates or updates a hostel.
        /// Use this to add a new hostel or modify an existing one. Ensures session and company context is set.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertHostel([FromBody] HostelUpsertRequest req)
        {
            try
            {
                if (req.CompanyID == 0 || req.CompanyID == null)
                {
                    req.CompanyID = await GetCompanyId();
                }
                if (req.SessionID == 0 || req.SessionID == null)
                {
                    req.SessionID = await GetSessionId();
                }
                var res = await _client.UpsertHostelAsync(req);
                object dataObj = res?.Data;   // ?? forces static binding, no dynamic operator resolution

                if (dataObj is JsonElement dataElement
                    && dataElement.ValueKind != JsonValueKind.Null
                    && dataElement.ValueKind != JsonValueKind.Undefined)
                {
                    var result = dataElement.TryGetProperty("result", out var resultProp) ? resultProp.GetInt32() : 0;
                    var message = dataElement.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown response.";
                    return Json(new { success = result == 1, message = message });
                }
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }


        /// <summary>
        /// Deletes one or more hostels by their IDs.
        /// Use this to remove hostels that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteHostel([FromBody] List<int> id)
        {
            try
            {
                var res = await _client.DeleteHostelAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Toggles the active status of one or more hostels (activate/deactivate).
        /// Use this to enable or disable hostels without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleHostelStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _client.ToggleHostelStatusAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion

        #region Hostel Room API Endpoints


        /// <summary>
        /// Retrieves a hostel room by its unique ID.
        /// Use this to fetch details for editing or displaying a specific hostel room.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHostelRoomByID(int id)
        {
            try
            {
                var res = await _client.GetHostelRoomByIDAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Creates or updates a hostel room.
        /// Use this to add a new hostel room or modify an existing one. Ensures session and company context is set.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertHostelRoom([FromBody] HostelRoomUpsertRequest req)
        {
            try
            {
                req.SessionID = await GetSessionId();
                req.CompanyID = await GetCompanyId();
                var res = await _client.UpsertHostelRoomAsync(req);
                object dataObj = res?.Data;   // ?? forces static binding, no dynamic operator resolution

                if (dataObj is JsonElement dataElement
                    && dataElement.ValueKind != JsonValueKind.Null
                    && dataElement.ValueKind != JsonValueKind.Undefined)
                {
                    var result = dataElement.TryGetProperty("result", out var resultProp) ? resultProp.GetInt32() : 0;
                    var message = dataElement.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown response.";
                    return Json(new { success = result == 1, message = message });
                }
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Deletes one or more hostel rooms by their IDs.
        /// Use this to remove hostel rooms that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteHostelRoom([FromBody] List<int> id)
        {
            try
            {
                var res = await _client.DeleteHostelRoomAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Toggles the active status of one or more hostel rooms (activate/deactivate).
        /// Use this to enable or disable hostel rooms without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleHostelRoomStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var res = await _client.ToggleHostelRoomStatusAsync(request);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion


        /// <summary>
        /// Shows the add/edit form for a room type.
        /// Use this to display the UI for creating or editing a room type, including cooling type options.
        /// </summary>
        public async Task<IActionResult> AddRoomType(int? id)
        {
            var model = new RoomTypeAddViewModel
            {
                RoomCoolingType = new List<RoomCoolingType>() // safe default, never null
            };
            try
            {
                var perms = await GetPermissions("/Hostel");
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                var roomCoolingType = await _roomCoolingTypeService.GetAllAsync(companyId, sessionId);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetRoomTypeByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditRoomType = response.Data;
                    }
                }
                else
                {
                    model.EditRoomType = null;
                }

                model.RoomCoolingType = roomCoolingType?.Data ?? new List<RoomCoolingType>();
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
        /// Shows the add/edit form for a hostel.
        /// Use this to display the UI for creating or editing a hostel, including country, state, city, and room type options.
        /// </summary>
        public async Task<IActionResult> AddHostel(int? id)
        {
            var model = new HostelAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel"
               );
                var sessionId = await GetSessionId();


                var country = await _countryService.GetAllAsync(await GetCompanyId(), sessionId);
                var state = await _stateService.GetAllAsync(await GetCompanyId(), sessionId);
                var city = await _cityService.GetAllAsync(await GetCompanyId(), sessionId);
                var resRoomType = await _client.GetAllRoomTypesAsync(false, sessionId);
                var resHostelRoom = await _hostelTypeService.GetAllAsync(await GetCompanyId(), sessionId);
                model.HostelTypes = resHostelRoom.Data ?? new List<HostelTypeModel>();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetHostelByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditHostel = response.Data;
                    }
                }
                else
                {
                    model.EditHostel = null;
                }
                model.Country = country.Data;
                model.State = state.Data;
                model.City = city.Data.Data;
                model.RoomTypes = resRoomType.Data ?? new List<RoomTypeViewModel>();
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
        /// Shows the add/edit form for a hostel room.
        /// Use this to display the UI for creating or editing a hostel room, including hostel, room type, and occupancy options.
        /// </summary>
        public async Task<IActionResult> AddHostelRoom(int? id)
        {
            var model = new HostelRoomAddViewModel
            {
                Hostels = new List<HostelViewModel>(),
                RoomTypes = new List<RoomCoolingType>(),
                RoomOccupancyTypes = new List<RoomTypeViewModel>()
            };
            try
            {
                var perms = await GetPermissions("/Hostel");
                var sessionId = await GetSessionId();
                var companyId = await GetCompanyId();

                var resHostel = await _client.GetAllHostelsAsync(false, sessionId, companyId);
                var resRoomType = await _roomCoolingTypeService.GetAllAsync(companyId, sessionId);
                var resRoomOccupancyType = await _client.GetAllRoomTypesAsync(false, sessionId, companyId);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetHostelRoomByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.Items = response.Data;
                        model.EditHostelRoom = response.Data;
                    }
                }
                else
                {
                    model.EditHostelRoom = null;
                }

                // guard against Success == true but Data == null
                model.Hostels = resHostel.Success ? (resHostel.Data ?? new List<HostelViewModel>()) : new List<HostelViewModel>();
                model.RoomTypes = resRoomType.Success ? (resRoomType.Data ?? new List<RoomCoolingType>()) : new List<RoomCoolingType>();
                model.RoomOccupancyTypes = resRoomOccupancyType.Success ? (resRoomOccupancyType.Data ?? new List<RoomTypeViewModel>()) : new List<RoomTypeViewModel>();
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
        /// Retrieves the rate details for a specific hostel room.
        /// Use this to fetch pricing or rate information for a hostel room.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHostelRoomRateByID(int id)
        {
            try
            {
                var res = await _client.GetHostelRoomRateByIDAsync(id);
                return Json(res);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        #region Hostel Type Section
        public async Task<IActionResult> HostelType(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelTypePageViewModel();
            try
            {
                model = await BuildHostelTypePageViewModel(
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
        public async Task<IActionResult> GetHostelTypePartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildHostelTypePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_HostelTypeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_SubjectTablePartial", new MstSubjectPageViewModel());
            }
        }

        // ✅ NEW — shared logic extracted from the original Subject() action, unchanged internally
        private async Task<HostelTypePageViewModel> BuildHostelTypePageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID)
        {
            var model = new HostelTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/HostelType"
               );

                var request = new HostelTypeSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                var sessionId = await GetSessionId();
                var classesResponse = _hostelTypeService.GetAllHostelTypeWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new HostelTypePageViewModel
                {
                    HostelType = pagedResult.Success ? pagedResult.Data.Data : new List<HostelTypeModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
                model.Permissions = perms;
                return model;
            }
            catch (Exception)
            {

                throw;
            }

        }

        /// <summary>
        /// Shows the hostel type management page for defining different hostel types (e.g., Boys, Girls, Staff).
        /// Use this to view, search, and manage hostel types.
        /// </summary>
        public async Task<IActionResult> HostelTypeold(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new HostelTypePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/HostelType"
               );

                var request = new HostelTypeSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };

                var sessionId = await GetSessionId();
                var classesResponse = _hostelTypeService.GetAllHostelTypeWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new HostelTypePageViewModel
                {
                    HostelType = pagedResult.Success ? pagedResult.Data.Data : new List<HostelTypeModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };
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
        /// Shows the add/edit form for a hostel type.
        /// Use this to display the UI for creating or editing a hostel type.
        /// </summary>
        public async Task<IActionResult> AddHostelType(int? id)
        {
            var model = new HostelTypeAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel"
               );

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _hostelTypeService.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.HostelType = response.Data;
                        model.EditHostelType = response.Data;
                    }
                }
                else
                {
                    model.EditHostelType = null;
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
        /// <summary>
        /// Creates or updates a hostel type.
        /// Use this to add a new hostel type or modify an existing one.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveHostelType([FromBody] HostelTypeUpsertRequest request)
        {
            try
            {
                var isCreate = request.HostelTypeID <= 0;

                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                var response = await _hostelTypeService.UpsertHostelTypeAsync(request);
                object dataObj = response?.Data;   // ?? forces static binding, no dynamic operator resolution

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
        /// <summary>
        /// Deletes one or more hostel types by their IDs.
        /// Use this to remove hostel types that are no longer needed.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteHostelType([FromBody] List<int> ids)
        {
            try
            {
                var response = await _hostelTypeService.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// Toggles the active status of one or more hostel types (activate/deactivate).
        /// Use this to enable or disable hostel types without deleting them.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleHostelType([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _hostelTypeService.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        /// <summary>
        /// Searches postal codes by a search term.
        /// Use this to provide auto-complete or lookup for postal codes.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> SearchPostalCode(string term)
        {
            try
            {
                var response = await _postalCodeService.SearchPostalCodeAsync(term);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        /// <summary>
        /// Retrieves all room occupancy types for a given room type.
        /// Use this to get occupancy options when assigning or editing rooms.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllRoomOccupancy(int roomTypeId)
        {
            try
            {
                var response = await _client.GetAllRoomOccupancyByRoomTypesWiseAsync(roomTypeId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        /// <summary>
        /// Retrieves a summary of a hostel, including statistics and details.
        /// Use this for dashboards or quick hostel overviews.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHostelSummary(int hostelId)
        {
            try
            {
                var response = await _client.GetHostelSummary(hostelId);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        #endregion

        /// <summary>
        /// Shows the hostel management report page with filters and summary data.
        /// Use this to analyze hostel usage, types, and room allocations.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> HostelManageReport(HotelReportSearchRequest request)
        {
            var vm = new HostelManageReportPageViewModel();
            try
            {
                request ??= new HotelReportSearchRequest();
                request.Mode = string.IsNullOrWhiteSpace(request.Mode) ? "REPORT" : request.Mode.ToUpperInvariant();
                request.PageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
                request.PageSize = request.PageSize <= 0 ? 10 : request.PageSize;
                request.CompanyID = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                request.SessionID = request.SessionID > 0 ? request.SessionID : await GetSessionId();
                var perms = await GetPermissions("/Academics/Class");
                var sessionTask = await _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = await _companyService.GetAllAsync();
                var hostel = await _client.GetAllHostelsAsync(false, request.SessionID, request.CompanyID);
                var hostelTypes = await _hostelTypeService.GetAllAsync(request.CompanyID, request.SessionID);
                var roomTypes = await _client.GetAllRoomTypesAsync(false, request.SessionID, request.CompanyID);
                var roomCoolingTypes = await _roomCoolingTypeService.GetAllAsync(request.CompanyID, request.SessionID);
                var data = await _client.GetAllHostelReportWithPageAsync(request);
                vm = new HostelManageReportPageViewModel
                {
                    Permissions = perms,
                    Companies = companiesTask.Data,
                    Sessions = sessionTask.Data,
                    Hostels = hostel.Data,
                    HostelTypes = hostelTypes.Data,
                    RoomTypes = roomTypes.Data,
                    RoomCoolingTypes = roomCoolingTypes.Data,
                    SearchRequest = request,

                    // NOTE: adjust the property name below (TOTALRECORDS / TotalRecords / whatever
                    // your GetAllHostelReportWithPageAsync row DTO actually exposes) to match your
                    // real model. This is the piece that was commented out before, and the view's
                    // pagination math (Model.TotalRecords / Model.PageSize) depends on it.
                    TotalRecords = data.Data?.FirstOrDefault()?.TOTALRECORDS ?? 0,
                    PageNumber = request.PageNumber,
                    PageSize = request.PageSize,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID
                };


                vm.Items = data.Data;
                //vm.TotalRecords = data.Data.FirstOrDefault()?.TOTALRECORDS ?? 0;

                return View(vm);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(vm);
            }

        }

        /// <summary>
        /// Retrieves hostel management report data for AJAX grid updates (filter/search/pagination).
        /// Use this for dynamic report grids in the UI.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> GetHostelManageReport([FromBody] HotelReportSearchRequest request)
        {
            try
            {
                if (request == null)
                    return Json(new { success = false, message = "Invalid request." });

                request.Mode = string.IsNullOrWhiteSpace(request.Mode) ? "REPORT" : request.Mode.ToUpperInvariant();
                request.PageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
                request.PageSize = request.PageSize <= 0 ? 10 : request.PageSize;
                request.CompanyID = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                request.SessionID = request.SessionID > 0 ? request.SessionID : await GetSessionId();

                var apiResult = await _client.GetAllHostelReportWithPageAsync(request);

                // Unwrap defensively — never let a null link in the chain reach JSON serialization.
                var rows = apiResult?.Data ?? new List<HostelReportResponse>();
                //var totalRecords = rows.FirstOrDefault()?.TOTALRECORDS ?? 0;
                //var totalPages = rows.FirstOrDefault()?.TotalPages
                //                  ?? (request.PageSize > 0 ? (int)Math.Ceiling((double)totalRecords / request.PageSize) : 0);

                return Json(new
                {
                    success = true,
                    mode = request.Mode,
                    data = rows,
                    //totalRecords,
                    //totalPages,
                    pageNumber = request.PageNumber,
                    pageSize = request.PageSize
                });
            }
            catch (Exception ex)
            {
                // _logger.LogError(ex, "Error loading hostel manage report");
                return Json(new { success = false, message = "Failed to load report data." });
            }
        }


    }
}
