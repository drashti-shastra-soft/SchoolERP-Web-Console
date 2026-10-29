// ============================================================================
// STEP 7: StudentFeesController.cs (client-facing controller) — full file,
// with a Refund action added. Additions vs. your original are marked
// "// >>> NEW".
// ============================================================================
using Microsoft.AspNetCore.Mvc;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Controllers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;
using System.Security.Claims;
namespace SchoolERPWebClient.Controllers
{
    // Change ": Controller" to YOUR base controller (the one that has GetCompanyId() / GetSessionId()).
    public class StudentFeesController : BaseController
    {
        private readonly IFeeCollectionClientService _feeCollectionClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IFieldClientService _fieldService;
        private static PermissionHelper permHelper;
        private readonly IStudentInformationClientService _studentService;
        private readonly IClassClientService _classService;

        public StudentFeesController(IFeeCollectionClientService feeCollectionClient,
           ICompanyClientService companyService, ISessionClientService sessionService,
           IFeeHeadClientService feeHeadService,
           IStudentInformationClientService studentService,
           IFieldClientService fieldService, IClassClientService classService,PermissionHelper permHelper) : base(permHelper)
        {
            _feeCollectionClient = feeCollectionClient;
            _companyService = companyService;
            _sessionService = sessionService;
            _studentService = studentService;
            _fieldService = fieldService;
            _classService = classService;
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


        //public async Task<IActionResult> StudentFeesDetails(int? id)
        //{
        //    var model = new StudentDetailsViewModel();
        //    try
        //    {
        //        //var perms = await GetPermissions(
        //        //    "/StudentFees/StudentFeesDetails"
        //        //);
        //        var companyId = await GetCompanyId();
        //        var sessionId = await GetSessionId();


        //        var role = User.FindFirst("UserTypeName")?.Value;
        //        if (role.Trim() == "Student")
        //        {
        //            id = int.Parse(User.FindFirst("StudentID")?.Value);
        //        }

        //        // Fetch all fields to ensure Transport, Hostel, and Guardian categories are included
        //        var fields = await _fieldService.GetByAllRecordStudetFiledAsync(companyId, sessionId, belongsTo: "students", id);

        //        var studentAddress = await _studentService.GetStudentAddressListAsync(companyId, sessionId, id.Value);
        //        var studentDocument = await _studentService.GetStudentDocumentsAsync(id.Value);
        //        var studentFee = await _studentService.GetStudentFeeTemplateListAsync(id.Value, companyId, sessionId);
        //        if (id.HasValue && id > 0)
        //        {
        //            var studentDetails = await _studentService.GetStudentByIDAsync(id.Value, companyId, sessionId);
        //            var studentloginDetails = await _studentService.GetStudentLoginDetailsBindAsync(studentDetails.Data.BasicInfo.StudentUserID.Value);
        //            if (studentDetails.Data.BasicInfo.StudentID > 0)
        //            {

        //                ViewBag.StudentDetails = studentDetails.Data;
        //                ViewBag.IsEdit = true;
        //            }
        //            model = studentDetails.Data;
        //            var studentTimeline = await _studentService.GetStudentTimeline(id.Value);
        //            if (studentTimeline != null)
        //            {
        //                model.StudentTimeline = studentTimeline.Data;
        //            }
        //            model.Role = role;
        //            model.Permissions = null;// perms;
        //            model.StudentFields = fields.Data;
        //            model.StudentAddress = studentAddress.Data;
        //            model.StudentDocuments = studentDocument.Data;
        //            model.StudentLoginDetails = studentloginDetails.Data;
        //            model.studentFeeDetailsModel = studentFee.Data;
        //        }
        //        model.StudentId = id;
        //        return View(model);
        //    }
        //    catch (Exception ex)
        //    {
        //        TempData["Error"] = ex.Message;
        //        return View(model);
        //    }
        //}
        public async Task<IActionResult> StudentFeesDetails(int? id)
        {
            var model = new StudentDetailsViewModel();
            try
            {
                var companyId = await GetCompanyId();
                var sessionId = await GetSessionId();

                var role = User.FindFirst("UserTypeName")?.Value?.Trim();
                if (role == "Student")
                {
                    int.TryParse(User.FindFirst("StudentID")?.Value, out var sid);
                    id = sid;
                }

                // No valid id: stop here, nothing to load
                if (!id.HasValue || id.Value <= 0)
                {
                    TempData["Error"] = "Student not found.";
                    model.Role = role;
                    return View(model);
                }

                int studentId = id.Value;

                var fields = await _fieldService.GetByAllRecordStudetFiledAsync(companyId, sessionId, belongsTo: "students", studentId);
                var studentAddress = await _studentService.GetStudentAddressListAsync(companyId, sessionId, studentId);
                var studentDocument = await _studentService.GetStudentDocumentsAsync(studentId);
                var studentFee = await _studentService.GetStudentFeeTemplateListAsync(studentId, companyId, sessionId);

                var studentDetails = await _studentService.GetStudentByIDAsync(studentId, companyId, sessionId);
                if (studentDetails?.Data == null || studentDetails.Data.BasicInfo == null)
                {
                    TempData["Error"] = "Student details not found.";
                    model.Role = role;
                    model.StudentId = studentId;
                    return View(model);
                }

                model = studentDetails.Data;

                if (model.BasicInfo.StudentID > 0)
                {
                    ViewBag.StudentDetails = studentDetails.Data;
                    ViewBag.IsEdit = true;
                }

                // Login details only if the student has a user account
                var studentUserId = model.BasicInfo.StudentUserID;
                if (studentUserId.HasValue && studentUserId.Value > 0)
                {
                    var studentloginDetails = await _studentService.GetStudentLoginDetailsBindAsync(studentUserId.Value);
                    model.StudentLoginDetails = studentloginDetails?.Data;
                }

                var studentTimeline = await _studentService.GetStudentTimeline(studentId);
                if (studentTimeline != null)
                    model.StudentTimeline = studentTimeline.Data;

                model.Role = role;
                model.Permissions = null;
                model.StudentFields = fields?.Data;
                model.StudentAddress = studentAddress?.Data;
                model.StudentDocuments = studentDocument?.Data;
                model.studentFeeDetailsModel = studentFee?.Data;
                model.StudentId = studentId;

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }


        private string SiteBaseUrl => $"{Request.Scheme}://{Request.Host}";

        // -------- Fee list (for your Student Fees page). In your existing page action do:
        //   var res = await _feeCollectionClient.GetStudentFeeListAsync(new StudentFeeListRequest
        //             { StudentId = id, CompanyId = await GetCompanyId(), SessionId = await GetSessionId() });
        //   model.studentFeeDetailsModel = res.Success ? res.Data : null;
        // ...or call this JSON action from JS if you load the table by ajax.
        [HttpGet]
        public async Task<IActionResult> GetStudentFeeList(int studentId)
        {
            try
            {
                var res = await _feeCollectionClient.GetStudentFeeListAsync(new StudentFeeListRequest
                {
                    StudentId = studentId,
                    CompanyId = await GetCompanyId(),
                    SessionId = await GetSessionId()
                });
                if (!res.Success || res.Data == null) return Json(new { success = false, message = res.Message });
                return Json(new { success = res.Data.Result > 0, message = res.Data.Message, data = res.Data.Data, total = res.Data.Total });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        // -------- Popup "Pay" : Cash / Cheque / DD / Bank Transfer / UPI / Card
        [HttpPost]
        public async Task<IActionResult> CollectOffline([FromBody] FeeCollectRequest req)
        {
            try
            {
                req.CompanyId = await GetCompanyId();
                req.SessionId = await GetSessionId();

                if (string.IsNullOrWhiteSpace(req.FeesJson))
                {
                    if (req.DetailIds == null || req.DetailIds.Count == 0)
                        return Json(new { success = false, message = "Please select at least one fee." });

                    req.FeesJson = System.Text.Json.JsonSerializer.Serialize(
                        req.DetailIds.Distinct().Select(id => new { DetailId = id, AddLess = "A" }));
                    // -> [{"DetailId":4,"AddLess":"A"}]
                }

                var res = await _feeCollectionClient.CollectOfflineAsync(req);
                if (!res.Success || res.Data == null) return Json(new { success = false, message = res.Message });

                return Json(new { success = res.Data.Result > 0, message = res.Data.Message, receiptNo = res.Data.ReceiptNo });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        // -------- Popup "Pay" when mode = Online  -> JS redirects the browser to the returned url
        [HttpPost]
        public async Task<IActionResult> StartOnline([FromBody] OnlineStartRequest req)
        {
            try
            {
                req.CompanyId = await GetCompanyId();
                req.SessionId = await GetSessionId();
                req.ReturnBaseUrl = SiteBaseUrl;                // Stripe sends the payer back to THIS site

                var res = await _feeCollectionClient.StartOnlineAsync(req);
                if (!res.Success || res.Data == null) return Json(new { success = false, message = res.Message });

                return Json(new { success = res.Data.Result > 0, message = res.Data.Message, url = res.Data.RedirectUrl });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }

        // -------- Stripe success_url lands here
        [HttpGet]
        public async Task<IActionResult> PaymentReturn(string session_id, int studentId)
        {
            try
            {
                var res = await _feeCollectionClient.FinalizeOnlineAsync(new OnlineFinalizeRequest { OrderId = session_id });

                if (res.Success && res.Data != null && res.Data.Result > 0)
                    TempData["FeeSuccess"] = $"Payment successful. Receipt: {res.Data.ReceiptNo}";
                else
                    TempData["FeeInfo"] = "Payment is being confirmed. It will show as paid shortly.";  // webhook will finish it
            }
            catch (Exception ex) { TempData["FeeError"] = ex.Message; }

            return RedirectToAction("Index", new { studentId });   // TODO: your Student Fees page route
        }

        // -------- Stripe cancel_url lands here
        [HttpGet]
        public async Task<IActionResult> PaymentCancelled(int onlinePaymentId, int studentId)
        {
            try { await _feeCollectionClient.CancelOnlineAsync(new OnlineCancelRequest { OnlinePaymentId = onlinePaymentId }); }
            catch { /* not critical */ }

            TempData["FeeInfo"] = "Payment cancelled.";
            return RedirectToAction("Index", new { studentId });   // TODO: your Student Fees page route
        }

        // >>> NEW ----------------------------------------------------------------
        // Refund an already-paid fee entry. Restrict to whoever should be allowed
        // to issue refunds — adjust role names to match your actual scheme, or
        // swap this for your existing permission-check pattern (GetPermissions/
        // PermissionHelper) if that's how the rest of this controller enforces access.
        [HttpPost]
        //Authorize(Roles = "Admin,Accountant")]
        public async Task<IActionResult> Refund([FromBody] RefundRequest req)
        {
            try
            {
                if (req == null || req.CollectionId <= 0)
                    return Json(new { success = false, message = "Invalid request." });

                req.UserId = GetUserId();
                req.CompanyId = await GetCompanyId();
                var res = await _feeCollectionClient.RefundAsync(req);
                if (!res.Success || res.Data == null) return Json(new { success = false, message = res.Message });

                return Json(new
                {
                    success = res.Data.Result > 0,
                    message = res.Data.Message,
                    refundId = res.Data.RefundId,
                    refundedAmount = res.Data.RefundedAmount
                });
            }
            catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
        }
        public async Task<IActionResult> Index(int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, int? classId, int? sectionId)
        {
            var model = new StudentFeePageViewModel();
            try
            {
                model = await BuildStudentFeePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, classId, sectionId);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStudentFeePartial(int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, int? classId, int? sectionId)
        {
            try
            {
                var model = await BuildStudentFeePageViewModel(
                    pageIndex, pageSize, search, companyId, sessionID, classId, sectionId);

                return PartialView("_StudentFeeTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_StudentFeeTablePartial", new StudentFeePageViewModel());
            }
        }


        private async Task<StudentFeePageViewModel> BuildStudentFeePageViewModel(
            int? pageIndex, int? pageSize, string? search, int? companyId,
            int? sessionID, int? classId,int? sectionId)
        {
            var model = new StudentFeePageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions("/StudentFees/Index");

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId(),
                    ClassID=classId,
                    SectionID=sectionId
                };

                var sessionId = await GetSessionId();

                // ── Parallel fetch — dropdowns + paged subjects ─────────────────
                var studentFeeTask = _feeCollectionClient.GetAllStudentFeeWithPageAsync(request);
                var sessionTask = _sessionService.GetAllAsync(false, request.CompanyID);
                var companiesTask = _companyService.GetAllAsync();
                var classTask = _classService.GetAllAsync(false, request.SessionID, request.CompanyID);
                await Task.WhenAll(studentFeeTask, sessionTask, companiesTask, classTask);

                var pagedResult = await studentFeeTask;

                model = new StudentFeePageViewModel
                {
                    StudentFee = pagedResult.Success ? pagedResult.Data.Data : new List<StudentFeeGetAllResponse>(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    //TotalPages = pagedResult.Data.TotalPages,   // ✅ make sure this is populated correctly (same TotalRecords/TotalPages swap risk flagged earlier)
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId = request.SessionID,
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    ClassList = (await classTask).Data ?? new(),
                  
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

    }
}