using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class VehicleClientService : BaseApiClient, IVehicleClientService
    {
        public VehicleClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<VehicleViewModel>>> GetAllVehiclesAsync(int companyId, int sessionId)
            => GetAsync<List<VehicleViewModel>>($"api/VehiclesApi/GetAllVehicles?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<VehicleViewModel>> GetVehicleByIDAsync(int id)
            => GetAsync<VehicleViewModel>($"api/VehiclesApi/GetVehicleByID/{id}");

        public async Task<ApiResponse<dynamic>> UpsertVehicleAsync(VehicleFormModel form)
        {
            var content = new MultipartFormDataContent();
            content.Add(new StringContent(form.VehicleID.ToString()), "VehicleID");
            content.Add(new StringContent(form.VehicleNumber ?? ""), "VehicleNumber");
            content.Add(new StringContent(form.VehicleModel ?? ""), "VehicleModel");
            content.Add(new StringContent(form.VehicleYearMade ?? ""), "VehicleYearMade");
            content.Add(new StringContent(form.VehicleRegNo ?? ""), "VehicleRegNo");
            content.Add(new StringContent(form.VehicleChasisNo ?? ""), "VehicleChasisNo");
            content.Add(new StringContent(form.VehicleMaxCapicity?.ToString() ?? ""), "VehicleMaxCapicity");
            content.Add(new StringContent(form.VehicleDriverName ?? ""), "VehicleDriverName");
            content.Add(new StringContent(form.VehicleDriverLicense ?? ""), "VehicleDriverLicense");
            content.Add(new StringContent(form.VehicleDriverContact ?? ""), "VehicleDriverContact");
            content.Add(new StringContent(form.VehicleNote ?? ""), "VehicleNote");
            content.Add(new StringContent(form.IsActive.ToString()), "IsActive");
            content.Add(new StringContent(form.CompanyID.ToString()), "CompanyID");
            content.Add(new StringContent(form.SessionID.ToString()), "SessionID");
            if (form.DriverPhoto != null)
            {
                //var fileContent = new StreamContent(form.DriverPhoto.OpenReadStream());
                //fileContent.Headers.ContentType = new MediaTypeHeaderValue(form.DriverPhoto.ContentType);
                //content.Add(fileContent, "DriverPhoto", form.DriverPhoto.FileName);
            }

            return await PostAsync<dynamic>("api/VehiclesApi/UpsertVehicle", content);
        }

        public Task<ApiResponse<dynamic>> DeleteVehicleAsync(List<int> id)
            => PostAsync<dynamic>($"api/VehiclesApi/DeleteVehicle", id);

        //public Task<ApiResponse<dynamic>> ToggleVehicleStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/VehiclesApi/ToggleVehicleStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/VehiclesApi/ToggleStatus", request);
        }
    }
}
