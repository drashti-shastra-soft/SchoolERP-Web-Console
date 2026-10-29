using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;
using System.Text.Json;

namespace SchoolERPWebClient.Controllers
{
    public class CoScholasticController : BaseController
    {
        private readonly ICoScholasticClientService _client;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        private readonly IUserMenuPermissionClientService _menuPerm;
        private readonly IClassClientService _classClient;
        public CoScholasticController(
            ICoScholasticClientService client,
            ISessionClientService sessionClient,
            IUserMenuPermissionClientService menuPerm,
            ICompanyClientService companyService,
            PermissionHelper permHelper,
            IClassClientService classClient) : base(permHelper)
        {
            _client = client;
            _sessionClient = sessionClient;
            _menuPerm = menuPerm;
            _companyService = companyService;
            _classClient = classClient;
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
                var response = await _sessionClient.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }

        public async Task<IActionResult> Index(CoScholasticSearchRequest request)
        {
            var model = new CoScholasticPageViewModel();
            try
            {
                model = await BuildCoScholasticPageViewModel(request);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetCoScholasticPartial(CoScholasticSearchRequest request)
        {
            try
            {
                var model = await BuildCoScholasticPageViewModel(request);

                return PartialView("_CoScholasticTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_CoScholasticTablePartial", new CoScholasticPageViewModel());
            }
        }


        private async Task<CoScholasticPageViewModel> BuildCoScholasticPageViewModel(CoScholasticSearchRequest request)
        {
            var model = new CoScholasticPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/CoScholastic/Index");

                
                var sessionId = await GetSessionId();
                var companyId = request.CompanyID > 0 ? request.CompanyID : await GetCompanyId();
                request.CompanyID = companyId;
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                // ── Parallel fetch — dropdowns + paged subjects ─────────────────
                var subjectTask = _client.GetAllCoScholasticWithPageAsync(request);
                var sessionTask = _sessionClient.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();
                await Task.WhenAll(subjectTask, sessionTask, companiesTask);

                var pagedResult = await subjectTask;

                model = new CoScholasticPageViewModel
                {
                    CoScholastic = pagedResult.Success ? pagedResult.Data.Data : new List<CoScholasticViewModel>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = request.SearchTerm,
                    CompanyId = request.CompanyID,
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new()
                };
                model.Permissions = perms;

                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return model;
            }

        }

        public async Task<IActionResult> Add(int? id)
        {
            var model = new CoScholasticAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Add"
               );
                var sessionId = await GetSessionId();
                var allNodes = await _client.GetAllAsync(await GetCompanyId(), null); // or whatever lists ALL CoScholastic rows
                model.ParentGroups = allNodes.Data;
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.EditCoScholastic = response.Data;
                    }
                }
                else
                {
                    model.EditCoScholastic = null;
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
        public async Task<IActionResult> Save([FromBody] CoScholasticRequest request)
        {
            try
            {
               
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                var response = await _client.UpsertAsync(request);
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

        public async Task<IActionResult> ClassCoScholastic()
        {
            var model = new ClassCoScholasticPageViewModel();
            try
            {
                var perms = await GetPermissions("/CoScholastic/ClassCoScholastic");
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var classesResp = await _classClient.GetAllAsync(false,sessionId,companyId); // ASSUMED signature — adjust to your real service

                model.CompanyID = companyId;
                model.SessionID = sessionId;
                model.Classes = (classesResp?.Data ?? new());
                model.Permissions = perms;

                //if (model.Classes.Any())
                //{
                //    model.ClassID = int.Parse(model.Classes.First().Value);
                //    model.Tree = await _client.GetClassTreeAsync(companyId, sessionId, model.ClassID);
                //}

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetTree(int classId)
        {
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();
                var tree = await _client.GetClassTreeAsync(companyId, sessionId, classId);
                return Json(new { success = true, data = tree });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveClassCoScholastic([FromBody] ClassCoScholasticSaveRequest request)
        {
            try
            {
                request.CompanyID = await GetCompanyId();
                request.SessionID = await GetSessionId();

                var userId = int.TryParse(
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value,
                    out var uid) ? uid : 0;
                var userName = User.Identity?.Name;

                var response = await _client.UpsertClassCoScholasticAsync(request);

                if (response == null)
                    return Json(new { success = false, message = "No response from the server." });

                if (!response.Success)
                    return Json(new { success = false, message = response.Message ?? "Failed to save mapping." });

                // The API may wrap the stored procedure's RESULT / MESSAGE inside Data
                if (response.Data is JsonElement el && el.ValueKind == JsonValueKind.Object)
                {
                    var result = el.TryGetProperty("result", out var r) && r.ValueKind == JsonValueKind.Number ? r.GetInt32() : 1;
                    var msg = el.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String ? m.GetString() : null;

                    if (result != 1)
                        return Json(new { success = false, message = msg ?? "Failed to save mapping." });

                    return Json(new { success = true, message = msg ?? "Mapping updated successfully." });
                }

                return Json(new
                {
                    success = true,
                    message = string.IsNullOrWhiteSpace(response.Message) ? "Mapping updated successfully." : response.Message
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
