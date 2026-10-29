using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    public class WeeklyHolidaysSettingController : BaseController
    {
        private readonly IWeeklyHolidaysSettingClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        public WeeklyHolidaysSettingController(IWeeklyHolidaysSettingClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService, PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
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

        /// <summary>
        /// Shows the 'HostelType' management page where you can define the different grades or Hostel Type in the school.
        /// </summary>
        

        private async Task<WeeklyHolidaysSettingPageViewModel> BuildWeeklyHolidaysPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            var model = new WeeklyHolidaysSettingPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/WeeklyHolidaysSetting/Index"
               );

                var request = new WeeklyHolidaysSettingSearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId()
                };

                var sessionId = await GetSessionId();
                var classesResponse = _client.GetAllWeeklyHolidaysSettingWithPageAsync(request);

                var sessionTask = _sessionService.GetAllAsync();
                var companiesTask = _companyService.GetAllAsync();

                await Task.WhenAll(classesResponse, sessionTask, companiesTask);

                var pagedResult = await classesResponse;

                model = new WeeklyHolidaysSettingPageViewModel
                {
                    WeeklyHolidaysSetting = pagedResult.Success ? pagedResult.Data.Data : new List<WeeklyHolidaysSettingModel>(),
                    Companies = (await companiesTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = companyId
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
        int? companyId)
        {
            var model = new WeeklyHolidaysSettingPageViewModel();
            try
            {
                model = await BuildWeeklyHolidaysPageViewModel(
                    pageIndex, pageSize, search, companyId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetWeeklyHolidaysPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId)
        {
            try
            {
                var model = await BuildWeeklyHolidaysPageViewModel(
                    pageIndex, pageSize, search, companyId);

                return PartialView("_WeeklyHolidaysTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_WeeklyHolidaysTablePartial", new ItemStockPageViewModel());
            }
        }

        public async Task<IActionResult> Add(int? id)
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Hostel/HostelType"
               );
                var model = new WeeklyHolidaysSettingAddViewModel();
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _client.GetByIDAsync(id.Value);
                    if (response.Success)
                    {
                        model.WeeklyHolidays = response.Data;
                        model.EditWeeklyHolidays = response.Data;
                    }
                }
                else
                {
                    model.EditWeeklyHolidays = null;
                }

                model.Permissions = perms;
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveWeeklyHoliday([FromBody] WeeklyHolidayBatchRequest request)
        {
            try
            {
                var isCreate = request.CompanyID <= 0;
                request.CompanyID = await GetCompanyId();
                var response = await _client.UpsertWeeklyHolidaysSettingAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> DeleteWeeklyHoliday([FromBody] List<int> ids)
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
        public async Task<IActionResult> ToggleWeeklyHoliday([FromBody] StatusUpdateRequest request)
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

    }
}
