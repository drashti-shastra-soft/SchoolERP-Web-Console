using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This service handles the actual work of sending requests to the main system to manage system settings and translations in the database via an API.
    /// </summary>
    public class SettingsClientService : BaseApiClient, ISettingsClientService
    {
        public SettingsClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        /// <summary>
        /// Sends a request to the server to fetch all translated words and phrases for the chosen language.
        /// </summary>
        public async Task<ApiResponse<Dictionary<string, string>>> GetTranslationsAsync(string language)
        {
            return await GetAsync<Dictionary<string, string>>($"api/SettingsApi/translations/{language}");
        }

        /// <summary>
        /// Sends a request to the server to change a translation for a specific word or phrase.
        /// </summary>
        public async Task<ApiResponse<bool>> UpdateTranslationAsync(TranslationUpdateModel model)
        {
            return await PostAsync<bool>("api/SettingsApi/translations/update", model);
        }

        public async Task<ApiResponse<List<FieldModel>>> GetAllFieldsAsync(int companyId, int sessionId, bool? isSystemField = null, string belongsTo = null)
        {
            return await GetAsync<List<FieldModel>>($"api/SettingsApi/fields?companyId={companyId}&sessionId={sessionId}&isSystemField={isSystemField}&belongsTo={belongsTo}");
        }

        public async Task<ApiResponse<FieldModel>> GetFieldByIDAsync(int id)
        {
            return await GetAsync<FieldModel>($"api/SettingsApi/fields/{id}");
        }

        public async Task<ApiResponse<bool>> UpsertFieldAsync(FieldViewModel model)
        {
            return await PostAsync<bool>("api/SettingsApi/fields/upsert", model);
        }

        public async Task<ApiResponse<bool>> DeleteFieldAsync(List<int> id)
        {
            return await PostAsync<bool>($"api/SettingsApi/fields/delete",id);
        }

        public async Task<ApiResponse<bool>> ToggleFieldStatusAsync(StatusUpdateRequest req)
        {
            return await PostAsync<bool>("api/SettingsApi/fields/toggle-status", req);
        }

        public async Task<ApiResponse<List<IDAutoGenSettings>>> GetIDAutoGenSettingsAsync(int? companyId, int? sessionId)
        {
            return await GetAsync<List<IDAutoGenSettings>>($"api/SettingsApi/id-autogen/settings?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<bool>> SaveIDAutoGenSettingsAsync(IDAutoGenRequest req)
        {
            return await PostAsync<bool>("api/SettingsApi/id-autogen/save", req);
        }

        public async Task<ApiResponse<PagedResult<FieldModel>>> GetAllFieldWithPageAsync(FieldSearchRequestModel request)
        {
            return await PostAsync<PagedResult<FieldModel>>("api/SettingsApi/GetAllFieldWithPage", request);
        }

        public async Task<ApiResponse<SpResult>> CopyFieldAsync(CopyRequest request)
        {
            return await PostAsync<SpResult>("api/SettingsApi/CopyField", request);
        }
    }
}
