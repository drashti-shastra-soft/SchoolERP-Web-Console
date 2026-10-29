using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class UserManagementClientService: BaseApiClient, IUserManagementClientService
    {
        public UserManagementClientService(HttpClient httpClient) : base(httpClient) { }

        public async Task<ApiResponse<List<UserPermissionViewModel>>> GetUserPermissions(int userId, int? roleID = null)
        {
            return await GetAsync<List<UserPermissionViewModel>>($"api/UserPermissions/GetUserPermissions?userId={userId}&roleId={roleID}");
        }

        /// <summary>
        /// Retrieves all permissions.
        /// </summary>
        /// <returns>List of permissions.</returns>
        public Task<ApiResponse<List<MstPermissionViewModel>>> GetAllPermissionsAsync()
        {
            return GetAsync<List<MstPermissionViewModel>>(
                "api/Permission/GetAllPermissions");
        }

        /// <summary>
        /// Retrieves the details of a specific permission.
        /// </summary>
        /// <param name="permissionID">Permission identifier.</param>
        /// <returns>Permission details.</returns>
        public Task<ApiResponse<MstPermissionViewModel>> GetPermissionByIDAsync(
            int permissionID)
        {
            return GetAsync<MstPermissionViewModel>(
                $"api/Permission/GetPermissionByID?permissionID={permissionID}");
        }

        /// <summary>
        /// Creates or updates a permission.
        /// </summary>
        /// <param name="request">Permission details.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<SpResult>> UpsertPermissionAsync(
            MstPermissionUpsertRequest request)
        {
            return PostAsync<SpResult>(
                "api/Permission/UpsertPermission",
                request);
        }

        /// <summary>
        /// Updates whether a permission is currently usable.
        /// </summary>
        /// <param name="permissionID">Permission identifier.</param>
        /// <param name="isActive">Active status.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<SpResult>> TogglePermissionStatusAsync(StatusUpdateRequest request)
        {
            return PostAsync<SpResult>(
                $"api/Permission/TogglePermissionStatus",request);
        }

        /// <summary>
        /// Deletes a permission from the database.
        /// </summary>
        /// <param name="permissionID">Permission identifier.</param>
        /// <returns>Operation result.</returns>
        public Task<ApiResponse<dynamic>> DeletePermissionAsync(
            List<int> permissionID)
        {
            return PostAsync<dynamic>(
                "api/Permission/DeletePermission",
                permissionID);
        }

        /// <summary>
        /// Retrieves all permissions.
        /// </summary>
        /// <returns>List of permissions.</returns>
        public Task<ApiResponse<List<UserRoleViewModel>>> GetAllRolesByUserAsync(int userId)
        {
            return GetAsync<List<UserRoleViewModel>>(
                $"api/RoleApi/GetAllRolesByUser?userId={userId}");
        }

        public async Task<ApiResponse<PagedResult<MstPermissionViewModel>>> GetAllPermissionWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<MstPermissionViewModel>>("api/Permission/GetAllPermissionWithPage", request);
        }
    }
}
