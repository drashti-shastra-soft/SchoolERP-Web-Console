using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This interface defines the rules for how the application talks to the security system to log users in.
    /// </summary>
    public interface IAuthClientService
    {
        /// <summary>
        /// Sends a login request (username and password) to the security system and waits for a response.
        /// </summary>
        Task<ApiResponse<UserSessionModel>> LoginAsync(Domain.LoginRequest request);
        Task<ApiResponse<UserSessionModel>> SwitchRoleAsync(SwitchRoleRequest request);
        Task<ApiResponse<dynamic>> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<ApiResponse<dynamic>> ValidateTokenAsync(string guid);
        Task<ApiResponse<dynamic>> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
