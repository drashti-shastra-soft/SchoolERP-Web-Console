using Microsoft.AspNetCore.Identity.Data;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This service handles the actual work of communicating with the security system to verify a user's login details and start their session.
    /// </summary>
    public class AuthClientService : BaseApiClient, IAuthClientService
    {
        public AuthClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        /// <summary>
        /// Performs the login action by sending the user's credentials to the security server and retrieving their session information if successful.
        /// </summary>
        public async Task<ApiResponse<UserSessionModel>> LoginAsync(Domain.LoginRequest request)
        {
            return await PostAsync<UserSessionModel>("api/auth/login", request);
        }

        public async Task<ApiResponse<UserSessionModel>> SwitchRoleAsync(SwitchRoleRequest request)
        {
            return await PostAsync<UserSessionModel>("api/auth/switchrole", request);
        }

        public async Task<ApiResponse<dynamic>> ValidateTokenAsync(string guid)
        {
            return await GetAsync<dynamic>($"api/ForgotPasswordAPI/ValidateToken?guid={guid}");
        }

        public async Task<ApiResponse<dynamic>> ForgotPasswordAsync(Domain.ForgotPasswordRequest request)
        {
            return await PostAsync<dynamic>($"api/ForgotPasswordAPI/ForgotPassword", request);
        }

        public async Task<ApiResponse<dynamic>> ResetPasswordAsync(Domain.ResetPasswordRequest request)
        {
            return await PostAsync<dynamic>($"api/ForgotPasswordAPI/ResetPassword", request);
        }
    }
}
