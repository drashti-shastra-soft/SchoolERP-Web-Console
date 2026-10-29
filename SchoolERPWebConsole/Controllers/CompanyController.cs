using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages company-related UI actions, such as switching the current active company.
    /// </summary>
    public class CompanyController : BaseController
    {
        private readonly ICompanyClientService _companyClient;
        private readonly ICurrencyClientService _currencyClient;

        public CompanyController(ICompanyClientService companyClient, ICurrencyClientService currencyClient, PermissionHelper permHelper) : base(permHelper)
        {
            _companyClient = companyClient;
            _currencyClient = currencyClient;
        }
        private async Task<int> GetCompanyId()
        {
            if (CurrentCompanyId == null)
            {
                var response = await _companyClient.GetUserCurrentCompanyAsync();
                return response?.Data ?? 0;
            }
            return CurrentCompanyId;
        }
        /// <summary>
        /// Sets the chosen school company as the 'active' one for the current user's session.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SetCurrent([FromBody] SetCurrentCompanyRequest request)
        {
            if (request == null || request.CompanyId <= 0)
                return Json(new { success = false, message = "Invalid company selection." });

            var response = await _companyClient.SetCurrentCompanyAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }

        [HttpGet]
        public async Task<IActionResult> GetAssignedCompanies()
        {
            var response = await _companyClient.GetAssignedCompaniesAsync();
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetUserCurrentCompany()
        {
            var response = await _companyClient.GetUserCurrentCompanyAsync();
            return Json(new { success = true, data = response.Data });
        }

        
    }
}
