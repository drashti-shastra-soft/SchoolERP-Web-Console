using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.Security.Claims;

namespace SchoolERPWebClient.Controllers
{
    public class FeeDiscountController : BaseController
    {
        private readonly IFeeDiscountClientService _client;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        public FeeDiscountController(IFeeDiscountClientService client,
            ICompanyClientService companyService, ISessionClientService sessionService,
            PermissionHelper permHelper) : base(permHelper)
        {
            _client = client;
            _companyService = companyService;
            _sessionService = sessionService;
        }
        /// <summary>
        /// Gets the current company ID, fetching from the service if not cached.
        /// </summary>
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
        /// Gets the current session ID, fetching from the service if not cached.
        /// </summary>
        private async Task<int> GetSessionId()
        {
            if (CurrentSessionId == null)
            {
                var response = await _sessionService.GetUserCurrentSessionAsync();
                return response?.Data ?? 0;
            }
            return CurrentSessionId;
        }
        private int GetUserId() => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value, out var id) ? id : 0;



        public IActionResult Index() => View();

        // ---------------- dropdowns ----------------
        [HttpGet]
        public async Task<IActionResult> GetConcessions()
        {
            try
            {
                var res = await _client.GetConcessionsAsync(await GetCompanyId());
                return Json(new { success = res.Success, message = res.Message, data = res.Data });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        [HttpGet]
        public async Task<IActionResult> GetDiscountByUsers()
        {
            try
            {
                var res = await _client.GetDiscountByUsersAsync(await GetCompanyId());
                return Json(new { success = res.Success, message = res.Message, data = res.Data });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        // ---------------- student fee lines ----------------
        [HttpGet]
        public async Task<IActionResult> GetRows(int studentId)
        {
            try
            {
                var res = await _client.GetRowsAsync(studentId, await GetCompanyId(), await GetSessionId());
                return Json(new { success = res.Success, message = res.Message, data = res.Data });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        [HttpGet]
        public async Task<IActionResult> GetHeader(int studentId, int? feeHeadId)
        {
            try
            {
                var req = new StudentFeeDiscountHeaderRequest 
                {
                    STUDENTID= studentId,
                    COMPANYID=await GetCompanyId(),
                    SESSIONID=await GetSessionId(),
                    FEEHEADID= feeHeadId
                };

                var res = await _client.GetHeaderAsync(req);
                return Json(new { success = res.Success, message = res.Message, data = res.Data });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        // ---------------- save ----------------
        [HttpPost]
        //[RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> Save([FromForm] StudentFeeDiscountSaveRequest req)
        {
            try
            {
                string? attachmentPath = null;

                var raw = Request.Form["Lines"].ToString();
                if (!string.IsNullOrWhiteSpace(raw))
                {
                    req.LINES = System.Text.Json.JsonSerializer.Deserialize<List<FeeDiscountLineRequest>>(
                        raw,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                }

                if (req.LINES.Count == 0)
                    return Json(new { success = false, message = "No fee lines received." });


                //if (form.File != null && form.File.Length > 0)
                //{
                //    var ext = Path.GetExtension(form.File.FileName).ToLowerInvariant();
                //    if (!AllowedExt.Contains(ext))
                //        return Json(new { success = false, message = "Only PDF, JPG or PNG files are allowed." });
                //    if (form.File.Length > MaxFileBytes)
                //        return Json(new { success = false, message = "File size must be 5 MB or less." });

                //    var folder = Path.Combine(_env.WebRootPath, "uploads", "feediscount");
                //    Directory.CreateDirectory(folder);

                //    var fileName = Guid.NewGuid().ToString("N") + ext;   // never trust the client's file name
                //    using (var stream = new FileStream(Path.Combine(folder, fileName), FileMode.Create))
                //        await form.File.CopyToAsync(stream);

                //    attachmentPath = "/uploads/feediscount/" + fileName;
                //}

                req.COMPANYID = await GetCompanyId();
                req.SESSIONID = await GetSessionId();
                var res = await _client.SaveAsync(req);
                if (!res.Success || res.Data == null)
                    return Json(new { success = false, message = res.Message });

                // SP returns RESULT = 0 on error (with the reason in MESSAGE)
                return Json(new { success = res.Data.RESULT > 0, message = res.Data.MESSAGE });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }
    }
}

