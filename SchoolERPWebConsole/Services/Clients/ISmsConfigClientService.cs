using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This interface defines the rules for how the application communicates with the main system to manage SMS (text message) gateway settings.
    /// </summary>
    public interface ISmsConfigClientService
    {
        /// <summary>
        /// Asks the main system for the current SMS gateway settings.
        /// </summary>
        Task<ApiResponse<MstSmsConfigViewModel>> GetSmsConfigAsync(int companyId);

        /// <summary>
        /// Sends information to the main system to update or save new SMS gateway settings.
        /// </summary>
        Task<ApiResponse<dynamic>> UpsertSmsConfigAsync(MstSmsConfigUpsertRequest request);
    }
}
