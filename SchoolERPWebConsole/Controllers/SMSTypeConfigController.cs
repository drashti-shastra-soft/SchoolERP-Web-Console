using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class SMSTypeConfigController : BaseController
    {
        private readonly ISMSTypeConfigClientService _client;
        private readonly ISMSTypeClientService _clientSMSType;
        private readonly ICompanyClientService _companyService;
        private readonly IPaymentMethodClientService _paymentClient;
        private readonly ISmsConfigClientService _smsClient;
        public SMSTypeConfigController(ISMSTypeConfigClientService client,
            PermissionHelper permHelper, ISMSTypeClientService clientSMSType,
            ICompanyClientService companyService, IPaymentMethodClientService paymentClient, ISmsConfigClientService smsClient) : base(permHelper)
        {
            _client = client;
            _clientSMSType = clientSMSType;
            _companyService = companyService;
            _paymentClient = paymentClient;
            _smsClient = smsClient;
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

        public async Task<IActionResult> Add(int? id)
        {
            var model = new SMSTypeConfigAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/VoucherType/Add"
               );
                var smsType = await _clientSMSType.GetAllAsync();
                var setDefultpaymentType = await _smsClient.GetSmsConfigAsync(await GetCompanyId());
                if (id.HasValue && id.Value > 0)
                {
                    //var response = await _client.GetByIDAsync(id.Value);
                    //if (response.Success)
                    //{
                    //    model.EditPaymentType = response.Data;
                    //}
                }
                else
                {
                    model.EditPaymentType = null;
                }
                if (setDefultpaymentType != null)
                {
                    if (setDefultpaymentType.Data != null)
                    {
                        model.ActiveSMSTypeId = setDefultpaymentType.Data.SMSTypeId;
                    }                    
                }

                model.SMSType = smsType.Data;
                model.Permissions = perms;
                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetFields(int smsTypeId)
        {
            try
            {
                int companyId = await GetCompanyId(); // however you resolve this elsewhere
                var fields = await _client.GetByCompanysmsTypeAsync(smsTypeId, companyId);
                return Json(fields);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        [HttpGet]
        public async Task<IActionResult> GetGatewayInfo(int smsTypeId)
        {
            try
            {
                var info = await _clientSMSType.GetByIDAsync(smsTypeId); // logoUrl, description, websiteUrl, countryName
                return Json(new { success = info != null, message = "Success", data = info });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
           
        }

        [HttpPost]
        public async Task<IActionResult> SaveBatch([FromBody] SaveSMSBatchRequest req)
        {
            try
            {
                int companyId = await GetCompanyId();
                req.CompanyId = companyId;
                var result = await _client.SaveBatchAsync(req);
                return Json(new { result });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SetDefaultGateway([FromBody] MstSmsConfigUpsertRequest request)
        {
            try
            {
                if (request == null || request.SMSTypeId is null || request.SMSTypeId <= 0)
                    return Json(new { success = false, message = "Please select a valid SMS gateway." });

                if (!ModelState.IsValid)
                {
                    var firstError = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .FirstOrDefault();
                    return Json(new { success = false, message = firstError ?? "Invalid request." });
                }

                request.CompanyId = await GetCompanyId();

                // Resolve the existing row for this company + gateway type so we UPDATE it
                // instead of relying solely on the proc to catch a duplicate. Adjust the
                // method name/signature to whatever your SMS client actually exposes.
                var existing = await _smsClient.GetSmsConfigAsync(request.CompanyId.Value);
                request.SmsId = existing?.Data?.SmsId ?? 0;

                var response = await _smsClient.UpsertSmsConfigAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


    }
}
