using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using System.ComponentModel.Design;
using System.Configuration;

namespace SchoolERPWebConsole.Controllers
{ 
    /// <summary>
   /// Controller for managing alumni events, including CRUD operations, file uploads, and event status.
   /// </summary>
    public class AlumniController : BaseController
    {
        private readonly IAlumniEventClientService _eventService;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        private readonly IClassClientService _classService;
        private readonly IConfiguration _configuration;
        private readonly IPhotoUploadService _photoService;
        private readonly IWebHostEnvironment _environment;
        public AlumniController(IAlumniEventClientService eventService,
            ICompanyClientService companyService, ISessionClientService sessionService, 
            IClassClientService classService, IConfiguration configuration, PermissionHelper permHelper, IPhotoUploadService photoService, IWebHostEnvironment environment) : base(permHelper)
        {
            _eventService = eventService;
            _companyService = companyService;
            _sessionService = sessionService;
            _classService = classService;
            _configuration = configuration;
            _photoService = photoService;
            _environment = environment;
        }
        /// <summary>
        /// Gets the current user's ID from claims.
        /// </summary>
        private int GetUserId() => int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value ?? "0");

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
        /// Gets the current session identifier for the logged-in user.
        /// </summary>
        /// <returns>The session ID.</returns>
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
        /// Gets the staff ID from user claims if available.
        /// </summary>
        private int? GetStaffID()
        {
            var staffClaim = User.FindFirst("StaffID")?.Value;
            return int.TryParse(staffClaim, out var staffId) ? staffId : null;
        }

        /// <summary>
        /// Retrieves alumni events for the current company, optionally filtered by search text.
        /// </summary>     
        [HttpGet]
        public async Task<IActionResult> GetEvents(string? searchText)
        {
            try
            {
                var companyId = await GetCompanyId();
                var response = await _eventService.GetEventsAsync(searchText, companyId);
                return Json(new { response.Success, response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Creates or updates an alumni event, including optional photo upload.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> UpsertEvent([FromForm] int EventID, [FromForm] string EventTitle, [FromForm] string? EventDescription,
                                        [FromForm] DateTime FromDate, [FromForm] DateTime ToDate, [FromForm] string? Location,
                                        [FromForm] int EventFor, [FromForm] int? SessionID, [FromForm] int? ClassID, [FromForm] string? SectionIDs,
                                        IFormFile? EventPhoto)
        {
            var req = new AlumniEventUpsertRequest
            {
                EventID = EventID,
                EventTitle = EventTitle,
                EventDescription = EventDescription,
                FromDate = FromDate,
                ToDate = ToDate,
                Location = Location,
                EventFor = EventFor,
                SessionID = SessionID ?? await GetSessionId(),
                ClassID = ClassID,
                SectionIDs = SectionIDs,
                CompanyId=await GetCompanyId()
            };

            if (EventPhoto != null && EventPhoto.Length > 0)
            {
                long MaxFileSizeMB = _configuration.GetValue<long>("FileUploadSettings:MaxFileSizeMB");
                long maxBytes = MaxFileSizeMB * 1024L * 1024L;

                if (EventPhoto.Length > maxBytes)
                {
                    return Json(new { success = false, message = $"File size exceeds the {MaxFileSizeMB} MB limit." });
                }

                req.EventPhotoName = EventPhoto.FileName;
                req.EventPhotoType = EventPhoto.ContentType;
            }

            var r = await _eventService.UpsertEventAsync(req);
            if (r.Data?.Result?.Result == 1)
            {
                int? eventID = r.Data.Result.EventID;
                if (EventPhoto != null && EventPhoto.Length > 0)
                {
                    using var memoryStream = new MemoryStream();
                    await EventPhoto.CopyToAsync(memoryStream);

                    byte[] fileBytes = memoryStream.ToArray();
                    PhotoUploadResult photoResult = new PhotoUploadResult();
                    if (req.EventPhotoName != null)
                    {
                        photoResult = await _photoService.SaveBase64PhotoAsync(
                            Convert.ToBase64String(fileBytes),
                            req.EventPhotoName ?? "photo.jpg",
                            PhotoModule.Event,
                            FolderNameModule.Documents,
                            eventID.Value
                        );
                        var attchment = new AlumniEventAttachmentUpsertRequest
                        {
                            EventID = eventID.Value,
                            Attachment = photoResult.PhotoUrl,
                            FileName = photoResult.FileName,
                            FileType = EventPhoto.ContentType

                        };
                        var attachment = await _eventService.AlumniEventAttachmentFileAsync(attchment);
                    }
                }
            }
            return Json(new { success = true, message = r.Message });
        }


        /// <summary>
        /// Deletes one or more alumni events by their IDs.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> DeleteEvent([FromBody] List<int> ids)
        {
            try
            {
                var userId = GetUserId();
                var result = await _eventService.DeleteEventAsync(ids);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Toggles the active/inactive status of an alumni event.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> ToggleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var result = await _eventService.ToggleEventStatusAsync(request);
                return Json(new { success = result.Success, message = result.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
            
        }
        /// <summary>
        /// Downloads the photo associated with a specific alumni event.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> DownloadPhoto(int id)
        {
          
            var response = await _eventService.GetEventPhotoAsync(id);

            if (!response.IsSuccessStatusCode)
                return NotFound();

            var bytes = await response.Content.ReadAsByteArrayAsync();

            var contentType =
                response.Content.Headers.ContentType?.MediaType
                ?? "application/octet-stream";

            var fileName =
                response.Content.Headers.ContentDisposition?.FileName?.Trim('"')
                ?? "EventPhoto";
            if (bytes == null) return NotFound();
            return File(bytes, contentType ?? "image/jpeg", fileName ?? "event_photo");
        }
        /// <summary>
        /// Displays the Add/Edit Alumni Event page. If id is provided, loads the event for editing.
        /// </summary>
        public async Task<IActionResult> Add(int? id)
        {
            var model = new AlumniEventAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                "/Add"
               );
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var sessionTask =await _sessionService.GetAllAsync(false, await GetCompanyId());
                var companiesTask = _companyService.GetAllAsync();
                var classes = await _classService.GetAllAsync(false, await GetSessionId(), await GetCompanyId(), staffId);

                if (id.HasValue && id.Value > 0)
                {
                    var response = await _eventService.GetEventsByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.AlumniEvent = response.Data;
                        model.EditAlumniEvent = response.Data;
                    }
                }
                else
                {
                    model.EditAlumniEvent = null;
                }
                model.ClassList = classes.Data;
                model.Sessions = sessionTask.Data;
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
        /// Builds the view model for the alumni event page, including permissions, companies, sessions, and events.
        /// </summary>
        public async Task<AlumniEventPageViewModel> BuildAlumniEventPageViewModel(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new AlumniEventPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Alumni/Events"
               );

                var request = new SearchRequest
                {
                    PageNumber = pageIndex ?? 1,
                    PageSize = pageSize ?? 10,
                    SearchKeyword = search,
                    CompanyID = companyId ?? await GetCompanyId(),
                    SessionID = sessionID ?? await GetSessionId()
                };
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                // Step 1: Fetch all recorded complaints, types of complaints, and where they came from (sources).
                //var complaints = await _client.GetAllComplaintsAsync();
                var complaints = _eventService.GetAllEventsWithPageAsync(request);


                var sessionTask = _sessionService.GetAllAsync(false, companyId);
                var companiesTask = _companyService.GetAllAsync();
                var classes =await _classService.GetAllAsync(false, request.SessionID, request.CompanyID, staffId);

                await Task.WhenAll(complaints, sessionTask, companiesTask);

                var pagedResult = await complaints;


                // Step 2: Combine this information to be shown on the complaint management screen.
                model = new AlumniEventPageViewModel
                {
                    AlumniEvent = pagedResult.Success ? pagedResult.Data.Data : new List<AlumniEventViewModel>(),
                    ClassList= classes.Data,
                    Companies = (await companiesTask).Data ?? new(),
                    Sessions = (await sessionTask).Data ?? new(),
                    TotalRecords = pagedResult.Data.TotalRecords,
                    PageNumber = pagedResult.Data.PageNumber,
                    PageSize = pagedResult.Data.PageSize,
                    SearchTerm = search,
                    CompanyId = request.CompanyID,
                    SessionId=request.SessionID

                };
                model.Permissions = perms;
                // Step 3: Open the 'Complaint' management page.
                return model;
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return model;
            }

        }
        /// <summary>
        /// Displays the main Alumni Events page with a list of events and related data.
        /// </summary>
        public async Task<IActionResult> Events(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            var model = new AlumniEventPageViewModel();
            try
            {
                model = await BuildAlumniEventPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                return View(model);
            }
        }

        /// <summary>
        /// Returns the partial view for the alumni event table with pagination (AJAX endpoint).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAlumniEventPartial(int? pageIndex,
        int? pageSize,
        string? search,
        int? companyId,
        int? sessionID)
        {
            try
            {
                var model = await BuildAlumniEventPageViewModel(pageIndex, pageSize, search, companyId, sessionID);

                return PartialView("_AlumniEventTablePartial", model);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
                // ✅ Return an empty/error-state partial rather than throwing into an AJAX response
                return PartialView("_AlumniEventTablePartial", new AlumniEventPageViewModel());
            }
        }

        /// <summary>
        /// Gets the list of classes for a given session, filtered by staff if available.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSessionWiseClassList(int? sessionId)
        {
            try
            {
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }
                var companyId = await GetCompanyId();
                var classes = await _classService.GetAllAsync(false, sessionId, companyId, staffId);
                return Json(new { classes.Success, classes.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        /// <summary>
        /// Displays the details of a specific alumni event.
        /// </summary>
        public async Task<IActionResult> ViewDetails(int? id)
        {
            var model = new AlumniEventAddPageViewModel();
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                "/Alumni/view"
               );
                var staffId = GetStaffID();
                if (staffId == null || staffId == 0)
                {
                    staffId = GetStaffID();
                    staffId = (staffId ?? 0) <= 0 ? null : staffId;
                }               
                if (id.HasValue && id.Value > 0)
                {
                    var response = await _eventService.GetEventsByIdAsync(id.Value);
                    if (response.Success)
                    {
                        model.AlumniEvent = response.Data;
                        model.EditAlumniEvent = response.Data;
                    }
                }
                else
                {
                    model.EditAlumniEvent = null;
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
    }
}
