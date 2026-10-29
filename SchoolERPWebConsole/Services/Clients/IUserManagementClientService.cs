using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public interface IUserManagementClientService
    {
        Task<ApiResponse<List<UserPermissionViewModel>>> GetUserPermissions(int userId, int? roleID = null);
        /// <summary>
        /// Retrieves all permissions.
        /// </summary>
        /// <returns>List of permissions.</returns>
        Task<ApiResponse<List<MstPermissionViewModel>>> GetAllPermissionsAsync();

        /// <summary>
        /// Retrieves the details of a specific permission.
        /// </summary>
        /// <param name="permissionID">Permission identifier.</param>
        /// <returns>Permission details.</returns>
        Task<ApiResponse<MstPermissionViewModel>> GetPermissionByIDAsync(
            int permissionID);

        /// <summary>
        /// Creates or updates a permission.
        /// </summary>
        /// <param name="request">Permission details.</param>
        /// <returns>Operation result.</returns>
        Task<ApiResponse<SpResult>> UpsertPermissionAsync(
            MstPermissionUpsertRequest request);
        Task<ApiResponse<SpResult>> TogglePermissionStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<dynamic>> DeletePermissionAsync(
            List<int> permissionID);

        Task<ApiResponse<List<UserRoleViewModel>>> GetAllRolesByUserAsync(int userId);

        Task<ApiResponse<PagedResult<MstPermissionViewModel>>> GetAllPermissionWithPageAsync(SearchRequest request);
    }
}
