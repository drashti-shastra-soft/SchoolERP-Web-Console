using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;

namespace SchoolERPWebClient.Controllers
{
    public class PaymentTypeConfigController : BaseController
    {
        private readonly IPaymentTypeConfigClientService _client;
        private readonly IPaymentTypeClientService _clientPaymentType;
        private readonly ICompanyClientService _companyService;
        private readonly IPaymentMethodClientService _paymentClient;
        public PaymentTypeConfigController(IPaymentTypeConfigClientService client,
            PermissionHelper permHelper, IPaymentTypeClientService clientPaymentType, 
            ICompanyClientService companyService, IPaymentMethodClientService paymentClient) : base(permHelper)
        {
            _client = client;
            _clientPaymentType = clientPaymentType;
            _companyService = companyService;
            _paymentClient = paymentClient;
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
            var model = new PaymentTypeConfigAddViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/VoucherType/Add"
               );
                var paymentType = await _clientPaymentType.GetAllAsync();
                var setDefultpaymentType = await _paymentClient.GetPaymentMethodByCompanyAsync(await GetCompanyId());
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
                if(setDefultpaymentType != null) 
                {
                    if(setDefultpaymentType.Data != null) 
                    {
                        model.ActivePaymentTypeId = setDefultpaymentType.Data.PaymentTypeId;
                    }                    
                }
                
                model.PaymentType = paymentType.Data;
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
        public async Task<IActionResult> GetFields(int paymentTypeId)
        {
            int companyId = await GetCompanyId(); // however you resolve this elsewhere
            var fields = await _client.GetByCompanyPaymentTypeAsync(paymentTypeId,companyId);
            return Json(fields);
        }

        [HttpGet]
        public async Task<IActionResult> GetGatewayInfo(int paymentTypeId)
        {
            var info = await _clientPaymentType.GetByIDAsync(paymentTypeId); // logoUrl, description, websiteUrl, countryName
            return Json(new { success = info != null, message = "Success", data = info });
        }

        [HttpPost]
        public async Task<IActionResult> SaveBatch([FromBody] SaveBatchRequest req)
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
        public async Task<IActionResult> SetDefaultGateway([FromBody] MstPaymentMethodUpsertRequest request)
        {
            var isCreate = request.PaymentId <= 0;       
            request.CompanyId = await GetCompanyId();
            if (request.CompanyId <= 0)
                return Json(new { success = false, message = "Unable to determine current company." });
            request.IsActive = true;
            var response = await _paymentClient.UpsertPaymentMethodAsync(request);
            return Json(new { success = response.Success, message = response.Message });
        }
    }
}
