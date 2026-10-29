using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class PickupPointClientService : BaseApiClient, IPickupPointClientService
    {
        public PickupPointClientService(HttpClient httpClient) : base(httpClient) { }

        public Task<ApiResponse<List<PickupPointViewModel>>> GetAllPickupPointsAsync(int companyId, int sessionId)
            => GetAsync<List<PickupPointViewModel>>($"api/PickupPointApi/GetAllPickupPoints?companyId={companyId}&sessionId={sessionId}");

        public Task<ApiResponse<PickupPointViewModel>> GetPickupPointByIDAsync(int id)
            => GetAsync<PickupPointViewModel>($"api/PickupPointApi/GetPickupPointByID/{id}");

        public Task<ApiResponse<dynamic>> UpsertPickupPointAsync(PickupPointUpsertRequest req)
            => PostAsync<dynamic>("api/PickupPointApi/UpsertPickupPoint", req);

        public Task<ApiResponse<dynamic>> DeletePickupPointAsync(List<int> id)
            => PostAsync<dynamic>($"api/PickupPointApi/DeletePickupPoint", id);

        //public Task<ApiResponse<dynamic>> TogglePickupPointStatusAsync(int id, bool isActive)
        //    => PostAsync<dynamic>($"api/PickupPointApi/TogglePickupPointStatus?id={id}&isActive={isActive}", null!);

        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/PickupPointApi/ToggleStatus", request);
        }

    }
}
