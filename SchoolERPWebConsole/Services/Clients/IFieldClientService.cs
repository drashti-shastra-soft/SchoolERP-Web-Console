using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IFieldClientService
    {
        Task<ApiResponse<List<FieldModel>>> GetAllFieldsAsync(
            int companyId,
            int sessionId,
            bool? isSystemField = null,
            string? belongsTo = null);

        Task<ApiResponse<List<IDAutoGenSettings>>> GetIDAutoGenSettingsAsync(
            int companyId,
            int sessionId);

        Task<ApiResponse<List<FieldModel>>> GetByAllRecordStudetFiledAsync(
            int companyId, int sessionId, string? belongsTo = null, int? recordId = null);
    }
}
