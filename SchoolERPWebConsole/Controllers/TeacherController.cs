using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Attributes;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class TeacherController : BaseController
    {
        private readonly IUtilityClientService _utilityClient;
        private readonly ICompanyClientService _companyClient;
        private readonly ISessionClientService _sessionClient;
        private readonly ICompanyClientService _companyService;
        public TeacherController(IUtilityClientService utilityClient, ICompanyClientService companyClient,
            ISessionClientService sessionClient,
            ICompanyClientService companyService, PermissionHelper permHelper) : base(permHelper)
        {
            _utilityClient = utilityClient;
            _companyClient = companyClient;
            _sessionClient = sessionClient;
            _companyService = companyService;
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
        [SkipPermissionCheck]
        public IActionResult Index()
        {
            return View();
        }
    }
}
