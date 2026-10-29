using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This interface defines the rules for how the application communicates with the main system to manage language translations and general settings.
    /// </summary>
    public interface ISettingsClientService
    {
        /// <summary>
        /// Asks the main system for all text translations for a specific language.
        /// </summary>
        Task<ApiResponse<Dictionary<string, string>>> GetTranslationsAsync(string language);

        /// <summary>
        /// Sends a request to the main system to update a specific translated piece of text.
        /// </summary>
        Task<ApiResponse<bool>> UpdateTranslationAsync(TranslationUpdateModel model);

        Task<ApiResponse<List<FieldModel>>> GetAllFieldsAsync(int companyId, int sessionId, bool? isSystemField = null, string belongsTo = null);
        Task<ApiResponse<FieldModel>> GetFieldByIDAsync(int id);
        Task<ApiResponse<bool>> UpsertFieldAsync(FieldViewModel model);
        Task<ApiResponse<bool>> DeleteFieldAsync(List<int> id);
        Task<ApiResponse<bool>> ToggleFieldStatusAsync(StatusUpdateRequest req);
        Task<ApiResponse<List<IDAutoGenSettings>>> GetIDAutoGenSettingsAsync(int? companyId, int? sessionId);
        Task<ApiResponse<bool>> SaveIDAutoGenSettingsAsync(IDAutoGenRequest req);
        Task<ApiResponse<PagedResult<FieldModel>>> GetAllFieldWithPageAsync(FieldSearchRequestModel request);
        Task<ApiResponse<SpResult>> CopyFieldAsync(CopyRequest request);
    }
}
