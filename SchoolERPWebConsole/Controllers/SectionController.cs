using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Text.Json;

namespace SchoolERPWebConsole.Controllers
{
        /// <summary>
     /// Controller for managing Section-related operations such as listing, adding, editing, deleting, and copying sections.
     /// </summary>
    public class SectionController : BaseController
    {
        private readonly ISectionClientService _sectionClient;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private const string MenuPath = "/Section";

        public SectionController(ISectionClientService sectionClient, IUserMenuPermissionClientService menuPerm ,
            PermissionHelper permHelper, ICompanyClientService companyService, ISessionClientService sessionService) : base(permHelper)
        {
            _sectionClient = sectionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _sessionService = sessionService;
        }

        /// <summary>
        /// Retrieves the current company ID for the logged-in user.
        /// </summary>
        /// <returns>The company ID as an integer.</returns>
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyService.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        /// <summary>
        /// Retrieves the current session ID for the logged-in user.
        /// </summary>
        /// <returns>The session ID as an integer.</returns>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == default(int))
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }

        /// <summary>
        /// Displays a paginated list of sections with filtering and permission checks.
        /// </summary>
        /// <param name="pageIndex">Current page index for pagination.</param>
        /// <param name="pageSize">Number of records per page.</param>
        /// <param name="search">Search keyword for filtering sections.</param>
        /// <param name="companyId">Company ID filter.</param>
        /// <param name="sessionID">Session ID filter.</param>
        /// <returns>Returns the section list view with model data.</returns>

        // Full page load (unchanged)
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model =new  MstSectionPageViewModel();
            try
            {
                model = await BuildSectionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }

        // AJAX partial load — returns just the table markup
        [HttpGet]
        public async Task<IActionResult> GetSectionsPartial(int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var model = new MstSectionPageViewModel();
            try
            {
                model = await BuildSectionPageViewModel(pageIndex, pageSize, search, companyId, sessionID);
                return PartialView("_SectionsTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
            
        }

        // Shared logic extracted so both actions use the same code
        private async Task<MstSectionPageViewModel> BuildSectionPageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId, int? sessionID)
        {
            var perms = await GetPermissions("/Section");
            var request = new HostelTypeSearchRequest
            {
                PageNumber = pageIndex ?? 1,
                PageSize = pageSize ?? 10,
                SearchKeyword = search,
                CompanyID = companyId ?? await GetCompanyId(),
                SessionID = sessionID ?? CurrentSessionId
            };

            var sectionResponse = _sectionClient.GetAllSectionWithPagePageAsync(request);
            var sessionTask = _sessionService.GetAllAsync(false,request.CompanyID);
            var companiesTask = _companyService.GetAllAsync();
            await Task.WhenAll(sectionResponse, sessionTask, companiesTask);
            var pagedResult = await sectionResponse;

            return new MstSectionPageViewModel
            {
                Sections = pagedResult.Success ? pagedResult.Data.Data : new List<MstSectionViewModel>(),
                Companies = (await companiesTask).Data ?? new(),
                Sessions = (await sessionTask).Data ?? new(),
                TotalRecords = pagedResult.Data.TotalRecords,
                //TotalPages = pagedResult.Data.TotalPages,
                PageNumber = pagedResult.Data.PageNumber,
                PageSize = pagedResult.Data.PageSize,
                SearchTerm = search,
                CompanyId = request.CompanyID,
                SessionId = request.SessionID,
                Permissions = perms
            };
        }
        
        /// <summary>
        /// Displays the add/edit section form. If an ID is provided, loads the section for editing.
        /// </summary>
        /// <param name="id">Section ID for editing (optional).</param>
        /// <returns>Returns the add/edit section view with model data.</returns>

        public async Task<IActionResult> Add(int? id)
        {
            var model = new MstSectionViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "//Section/Add"
               );

                // Step 1: Initialize a new blank page model.
                

                // Step 2: If we are editing an existing person (ID is provided), fetch their details.

                if (id.HasValue && id.Value > 0)
                {
                    var sectionRes = await _sectionClient.GetByIDAsync(id.Value);
                    if (sectionRes.Success)
                    {
                        model.EditSections = sectionRes.Data;
                    }
                }
                else
                {
                    model.EditSections = null;
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
        /// Retrieves section details by ID for editing (AJAX).
        /// </summary>
        /// <param name="id">Section ID.</param>
        /// <returns>JSON result with section data or error message.</returns>
        [HttpGet]
        public async Task<IActionResult> GetSection(int id)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit sections." });

                var response = await _sectionClient.GetByIDAsync(id);
                if (!response.Success) return Json(new { success = false, message = response.Message });
                return Json(new { success = true, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Saves or updates a section record. Handles both create and edit operations.
        /// </summary>
        /// <param name="request">Section upsert request payload.</param>
        /// <returns>JSON result indicating success or failure.</returns>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] MstSectionUpsertRequest request)
        {
            try
            {                
                
                if(request.SessionId==0 || request.SessionId == null) 
                {
                    request.SessionId = await GetSessionId();
                }
                if (request.CompanyId == 0 || request.CompanyId == null)
                {
                    request.CompanyId = await GetCompanyId();
                }
                var isCreate = request.SectionID <= 0;
                if (isCreate && !(await _menuPerm.Has(MenuPath, "Add")).Data)
                    return Json(new { success = false, message = "You do not have permission to add sections." });
                if (!isCreate && !(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to edit sections." });

                var response = await _sectionClient.UpsertAsync(request);
                object dataObj = response?.Data;   

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
                return Json(new { success = true, message = ex.Message });
            }            
        }

        /// <summary>
        /// Toggles the active status of one or more sections.
        /// </summary>
        /// <param name="request">Status update request payload.</param>
        /// <returns>JSON result indicating success or failure.</returns>

        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to change section status." });

                var response = await _sectionClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }

        /// <summary>
        /// Deletes one or more sections by their IDs.
        /// </summary>
        /// <param name="ids">List of section IDs to delete.</param>
        /// <returns>JSON result indicating success or failure.</returns>
        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] List<int> ids)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Delete")).Data)
                    return Json(new { success = false, message = "You do not have permission to delete sections." });

                var response = await _sectionClient.DeleteAsync(ids);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        /// <summary>
        /// Copies selected sections to another session.
        /// </summary>
        /// <param name="request">Section copy request payload.</param>
        /// <returns>JSON result indicating success or failure.</returns>
        [HttpPost]
        public async Task<IActionResult> CopyToSession([FromBody] SectionCopyRequest request)
        {
            try
            {
                if (!(await _menuPerm.Has(MenuPath, "Edit")).Data)
                    return Json(new { success = false, message = "You do not have permission to delete sections." });

                var response = await _sectionClient.CopyToSessionAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
    }
}
