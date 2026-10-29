using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting.Internal;
using SchoolERPWebClient.Helpers;
using SchoolERPWebConsole.Domain;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services.Clients;
using Microsoft.AspNetCore.Hosting;

namespace SchoolERPWebConsole.Controllers
{
    /// <summary>
    /// This controller manages the school's transport system, including bus routes, pickup points, and assigning vehicles to those routes.
    /// </summary>
    public class TransportController : BaseController
    {
        private readonly IPickupPointClientService _pickupPointClient;
        private readonly IRouteClientService _routeClient;
        private readonly IVehicleClientService _vehicleClient;
        private readonly IVehicleAssignClientService _vehicleAssignClient;
        private readonly IRoutePickupPointClientService _rppClient;
        private readonly ICompanyClientService _companyService;
        private readonly ISessionClientService _sessionService;
        public TransportController(
            IPickupPointClientService pickupPointClient, 
            IRouteClientService routeClient,
            IVehicleClientService vehicleClient,
            IVehicleAssignClientService vehicleAssignClient,
            ICompanyClientService companyService,
            ISessionClientService sessionService,
            IRoutePickupPointClientService rppClient, PermissionHelper permHelper) : base(permHelper)
        {
            _pickupPointClient = pickupPointClient;
            _routeClient = routeClient;
            _vehicleClient = vehicleClient;
            _vehicleAssignClient = vehicleAssignClient;
            _rppClient = rppClient;
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

        #region Pickup Point Endpoints
        public async Task<IActionResult> PickupPoint()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Transport/PickupPoint"
               );
                var companyid= await GetCompanyId();
                var sessionId = await GetSessionId(); 
                var res = await _pickupPointClient.GetAllPickupPointsAsync(companyid, sessionId);
                var model = new PickupPointPageViewModel
                {
                    Items = res.Success ? res.Data : new List<PickupPointViewModel>()
                };
                model.Permissions = perms;
                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> AddPickupPoint(int? id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/PickupPoint");

                var model = new PickupPointPageViewModel
                {
                    Permissions = perms
                };

                if (id.HasValue && id.Value > 0)
                {
                    var res = await _pickupPointClient.GetPickupPointByIDAsync(id.Value);
                    if (res.Success)
                    {
                        model.EditPickupPoint = res.Data;
                    }
                    else
                    {
                        ViewBag.ErrorMessage = res.Message;
                    }
                }

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetPickupPointByID(int id)
        {
            var res = await _pickupPointClient.GetPickupPointByIDAsync(id);
            return Json(new { success = res.Success, data = res.Data, message = res.Message });
        }

        [HttpPost]
        public async Task<IActionResult> UpsertPickupPoint([FromBody] PickupPointUpsertRequest request)
        {
            try
            {
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                var res = await _pickupPointClient.UpsertPickupPointAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeletePickupPoint([FromBody] List<int> id)
        {
            var res = await _pickupPointClient.DeletePickupPointAsync(id);
            return Json(new { success = true, message = res.Message });
        }

        //[HttpPost]
        //public async Task<IActionResult> TogglePickupPointStatus(int id, bool isActive)
        //{
        //    var res = await _pickupPointClient.TogglePickupPointStatusAsync(id, isActive);
        //    return Json(new { success = res.Success, message = res.Message });
        //}

        [HttpPost]
        public async Task<IActionResult> TogglePickupPointStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _pickupPointClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }

        #endregion

        #region Routes Endpoints
        public async Task<IActionResult> Routes()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Transport/Routes"
               );
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _routeClient.GetAllRoutesAsync(companyid,sessionId);
                var model = new RoutePageViewModel
                {
                    Items = res.Success ? res.Data : new List<RouteViewModel>()
                };
                model.Permissions = perms;
                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }
           
        }

        [HttpGet]
        public async Task<IActionResult> AddRoute(int? id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/Routes");

                var model = new RoutePageViewModel
                {
                    Permissions = perms
                };

                if (id.HasValue && id.Value > 0)
                {
                    var res = await _routeClient.GetRouteByIDAsync(id.Value);
                    if (res.Success)
                    {
                        model.EditRoute = res.Data;
                    }
                    else
                    {
                        ViewBag.ErrorMessage = res.Message;
                    }
                }

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetRouteByID(int id)
        {
            var res = await _routeClient.GetRouteByIDAsync(id);
            return Json(new { success = res.Success, data = res.Data, message = res.Message });
        }

        [HttpPost]
        public async Task<IActionResult> UpsertRoute([FromBody] RouteUpsertRequest request)
        {
            try
            {
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                var res = await _routeClient.UpsertRouteAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception)
            {

                throw;
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteRoute([FromBody] List<int> id)
        {
            var res = await _routeClient.DeleteRouteAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }

        //[HttpPost]
        //public async Task<IActionResult> ToggleRouteStatus(int id, bool isActive)
        //{
        //    var res = await _routeClient.ToggleRouteStatusAsync(id, isActive);
        //    return Json(new { success = res.Success, message = res.Message });
        //}

        [HttpPost]
        public async Task<IActionResult> ToggleRouteStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _routeClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion

        #region Vehicles Endpoints
        //public async Task<IActionResult> Vehicles()
        //{
        //    try
        //    {
        //        // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
        //        var perms = await GetPermissions("/Transport/Vehicles");
        //        var companyid = await GetCompanyId();
        //        var sessionId = await GetSessionId();
        //        var res = await _vehicleClient.GetAllVehiclesAsync(companyid, sessionId);
        //        var model = new VehiclePageViewModel
        //        {
        //            Items = res.Success ? res.Data : new List<VehicleViewModel>()
        //        };
        //        model.Permissions = perms;
        //        if (!res.Success) ViewBag.ErrorMessage = res.Message;
        //        return View(model);
        //    }
        //    catch (Exception)
        //    {

        //        throw;
        //    }

        //}

        public async Task<IActionResult> Vehicles()
        {
            try
            {
                var perms = await GetPermissions("/Transport/Vehicles");
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _vehicleClient.GetAllVehiclesAsync(companyid, sessionId);
                var Vehicles = res.Success ? res.Data : new List<VehicleViewModel>();

                if (Vehicles != null && Vehicles.Count > 0)
                {
                    foreach (var mVehicle in Vehicles)
                    {
                        mVehicle.Base64String = StaticMethods.ResolveVehicleImageBase64(mVehicle.FileName);
                    }
                }

                var model = new VehiclePageViewModel
                {
                    Items = Vehicles,
                    Permissions = perms
                };

                if (!res.Success) ViewBag.ErrorMessage = res.Message;

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpGet]
        public async Task<IActionResult> AddVehicle(int? id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/Vehicles");
                var Vehicle = new VehiclePageViewModel
                {
                    Permissions = perms
                };

                // Default: no vehicle loaded yet (Add mode) ? show placeholder image
                Vehicle.EditVehicle = new VehicleViewModel
                {
                    Base64String = StaticMethods.ResolveVehicleImageBase64(null)
                };

                if (id.HasValue && id.Value > 0)
                {
                    var res = await _vehicleClient.GetVehicleByIDAsync(id.Value);
                    if (res.Success)
                    {
                        Vehicle.EditVehicle = res.Data;
                        Vehicle.EditVehicle.Base64String = StaticMethods.ResolveVehicleImageBase64(Vehicle.EditVehicle.FileName);
                    }
                    else
                    {
                        ViewBag.ErrorMessage = res.Message;
                    }
                }

                return View(Vehicle);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetVehicleByID(int id)
        {
            var res = await _vehicleClient.GetVehicleByIDAsync(id);

            if (res.Success && res.Data != null)
            {
                res.Data.Base64String = StaticMethods.ResolveVehicleImageBase64(res.Data.FileName);
            }

            return Json(new { success = res.Success, data = res.Data, message = res.Message });
        }

        //[HttpPost]
        //public async Task<IActionResult> UpsertVehicle([FromForm] VehicleFormModel form)
        //{
        //    try
        //    {
        //        if (form.CompanyID == default(int) || form.CompanyID == null)
        //        {
        //            form.CompanyID = await GetCompanyId();
        //        }
        //        if (form.SessionID == default(int) || form.SessionID == null)
        //        {
        //            form.SessionID = await GetSessionId();
        //        }
        //        var res = await _vehicleClient.UpsertVehicleAsync(form);
        //        return Json(new { success = res.Success, message = res.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Ok(new { success = false, message = ex.Message });
        //    }

        //}

        [HttpPost]
        public async Task<IActionResult> UpsertVehicle([FromForm] VehicleFormModel form)
        {
            try
            {
                if (form.CompanyID == default(int))
                {
                    form.CompanyID = await GetCompanyId();
                }

                if (form.SessionID == default(int))
                {
                    form.SessionID = await GetSessionId();
                }

                // Save Driver Photo
                if (form.DriverPhoto != null && form.DriverPhoto.Length > 0)
                {
                    var uploadsFolder = Path.Combine(
                        Directory.GetCurrentDirectory(), "wwwroot", "uploads", "Image" );

                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }

                    var extension = Path.GetExtension(form.DriverPhoto.FileName);

                    var uniqueFileName = $"Driver_{Guid.NewGuid():N}{extension}";

                    var filePath = Path.Combine(uploadsFolder,uniqueFileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await form.DriverPhoto.CopyToAsync(stream);
                    }

                    // Save only filename in database
                    form.VehicleDriverPhotoName = uniqueFileName;
                }

                var res = await _vehicleClient.UpsertVehicleAsync(form);

                return Json(new
                {
                    success = res.Success,
                    message = res.Message
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpGet]
        public async Task<IActionResult> ViewVehicle(int id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/Vehicles");
                var res = await _vehicleClient.GetVehicleByIDAsync(id);

                if (!res.Success || res.Data == null)
                {
                    ViewBag.ErrorMessage = res.Message ?? "Vehicle not found.";
                    return View(new VehiclePageViewModel { Permissions = perms });
                }

                res.Data.Base64String = StaticMethods.ResolveVehicleImageBase64(res.Data.FileName);

                var model = new VehiclePageViewModel
                {
                    EditVehicle = res.Data,
                    Permissions = perms
                };

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteVehicle([FromBody] List<int> id)
        {
            var res = await _vehicleClient.DeleteVehicleAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }

        [HttpPost]
        public async Task<IActionResult> ToggleVehicleStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _vehicleClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion  

        #region Vehicle Assign Endpoints
        public async Task<IActionResult> VehicleAssign()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Transport/VehicleAssign"
               );
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _vehicleAssignClient.GetAllAssignmentsAsync(companyid,sessionId);
                var routesRes = await _routeClient.GetAllRoutesAsync(companyid,sessionId);
                var vehiclesRes = await _vehicleClient.GetAllVehiclesAsync(companyid,sessionId);

                var model = new VehicleAssignPageViewModel
                {
                    Items = res.Success ? res.Data : new List<VehicleAssignViewModel>(),
                    Routes = routesRes.Success ? routesRes.Data : new List<RouteViewModel>(),
                    Vehicles = vehiclesRes.Success ? vehiclesRes.Data : new List<VehicleViewModel>()
                };
                model.Permissions = perms;
                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }
            
        }

        [HttpGet]
        public async Task<IActionResult> AddVehicleAssign(int? id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/VehicleAssign");

                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();

                var routesRes = await _routeClient.GetAllRoutesAsync(companyid, sessionId);
                var vehiclesRes = await _vehicleClient.GetAllVehiclesAsync(companyid, sessionId);

                var model = new VehicleAssignPageViewModel
                {
                    Routes = routesRes.Success ? routesRes.Data : new List<RouteViewModel>(),
                    Vehicles = vehiclesRes.Success ? vehiclesRes.Data : new List<VehicleViewModel>(),
                    Permissions = perms
                };

                if (id.HasValue && id.Value > 0)
                {
                    var allRes = await _vehicleAssignClient.GetAllAssignmentsAsync(companyid, sessionId);

                    if (allRes.Success && allRes.Data != null)
                    {
                        var existingItems = allRes.Data.Where(x => x.RouteID == id.Value).ToList();

                        if (existingItems.Any())
                        {
                            model.EditVehicleAssign = existingItems.First();
                            model.EditVehicleIDs = existingItems.Select(x => x.VehicleID).Distinct().ToList();
                            model.EditVehicleAssignIDs = existingItems.Select(x => x.VehicleAssignID).Distinct().ToList();
                        }
                    }
                    else
                    {
                        ViewBag.ErrorMessage = allRes.Message;
                    }
                }

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpsertAssignments([FromBody] VehicleAssignUpsertRequest request)
        {
            try
            {
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                var res = await _vehicleAssignClient.UpsertAssignmentsAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAssignment([FromBody] List<int> id)
        {
            var res = await _vehicleAssignClient.DeleteAssignmentAsync(id);
            return Json(new { success = res.Success, message = res.Message });
        }

        //[HttpPost]
        //public async Task<IActionResult> ToggleAssignmentStatus(int id, bool isActive)
        //{
        //    var res = await _vehicleAssignClient.ToggleAssignmentStatusAsync(id, isActive);
        //    return Json(new { success = res.Success, message = res.Message });
        //}

        [HttpPost]
        public async Task<IActionResult> ToggleAssignmentStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _vehicleAssignClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion

        #region Route Pickup Points Endpoints
        public async Task<IActionResult> RoutePickupPoints()
        {
            try
            {
                // Retrieves the logged-in user's access rights (View, Add, Edit, Delete, etc.)
                var perms = await GetPermissions(
                   "/Transport/RoutePickupPoints"
               );
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var res = await _rppClient.GetAllRoutePickupPointsAsync(companyid, sessionId);
                var routesRes = await _routeClient.GetAllRoutesAsync(companyid, sessionId);
                var pointsRes = await _pickupPointClient.GetAllPickupPointsAsync(companyid,sessionId);

                var model = new RoutePickupPointPageViewModel
                {
                    Items = res.Success ? res.Data : new List<RoutePickupPointViewModel>(),
                    Routes = routesRes.Success ? routesRes.Data : new List<RouteViewModel>(),
                    PickupPoints = pointsRes.Success ? pointsRes.Data : new List<PickupPointViewModel>()
                };
                model.Permissions = perms;
                if (!res.Success) ViewBag.ErrorMessage = res.Message;
                return View(model);
            }
            catch (Exception)
            {

                throw;
            }
           
        }

        [HttpGet]
        public async Task<IActionResult> AddRoutePickupPoint(int? id)
        {
            try
            {
                var perms = await GetPermissions("/Transport/RoutePickupPoints");
                var companyid = await GetCompanyId();
                var sessionId = await GetSessionId();
                var routesRes = await _routeClient.GetAllRoutesAsync(companyid, sessionId);
                var pointsRes = await _pickupPointClient.GetAllPickupPointsAsync(companyid, sessionId);

                var model = new RoutePickupPointPageViewModel
                {
                    Routes = routesRes.Success ? routesRes.Data : new List<RouteViewModel>(),
                    PickupPoints = pointsRes.Success ? pointsRes.Data : new List<PickupPointViewModel>(),
                    Permissions = perms
                };

                if (id.HasValue && id.Value > 0)
                {
                    var res = await _rppClient.GetRoutePickupPointByIDAsync(id.Value);
                    if (res.Success)
                    {
                        model.EditRoutePickupPoint = res.Data;
                    }
                    else
                    {
                        ViewBag.ErrorMessage = res.Message;
                    }
                }

                return View(model);
            }
            catch (Exception)
            {
                throw;
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetRoutePickupPointByID(int id)
        {
            var res = await _rppClient.GetRoutePickupPointByIDAsync(id);
            return Json(new { success = res.Success, data = res.Data, message = res.Message });
        }

        [HttpPost]
        public async Task<IActionResult> UpsertRoutePickupPoint([FromBody] RoutePickupPointUpsertRequest request)
        {
            try
            {
                if (request.CompanyID == 0 || request.CompanyID == null)
                {
                    request.CompanyID = await GetCompanyId();
                }
                if (request.SessionID == 0 || request.SessionID == null)
                {
                    request.SessionID = await GetSessionId();
                }
                var res = await _rppClient.UpsertRoutePickupPointAsync(request);
                return Json(new { success = res.Success, message = res.Message });
            }
            catch (Exception)
            {

                throw;
            }
            
        }

        [HttpPost]
        public async Task<IActionResult> DeleteRoutePickupPoint([FromBody] List<int> id)
        {
            var res = await _rppClient.DeleteRoutePickupPointAsync(id);
            return Json(new { success = true, message = res.Message });
        }

        //[HttpPost]
        //public async Task<IActionResult> ToggleRoutePickupPointStatus(int id, bool isActive)
        //{
        //    var res = await _rppClient.ToggleRoutePickupPointStatusAsync(id, isActive);
        //    return Json(new { success = res.Success, message = res.Message });
        //}

        [HttpPost]
        public async Task<IActionResult> ToggleRoutePickupPointStatus([FromBody] StatusUpdateRequest request)
        {
            try
            {
                var response = await _rppClient.ToggleStatusAsync(request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }

        }
        #endregion
    }
}
