using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IUserMenuPermissionClientService
    {
        /// <summary>
        /// Retrieves the ID of the currently logged-in user.
        /// </summary>
        Task<ApiResponse<int>> GetCurrentUserIdAsync();

        /// <summary>
        /// Checks whether the currently logged-in user has the specified permission.
        /// </summary>
        Task<ApiResponse<bool>> Has(
            string menuUrlPrefix,
            string permissionName);
    }
}
