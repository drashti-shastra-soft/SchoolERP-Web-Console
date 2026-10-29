using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This interface defines the rules for how the application communicates with the main system to manage the navigation menus (what you see in the sidebar).
    /// </summary>
    public interface IMenuClientService
    {
        /// <summary>
        /// Asks the main system for a list of all menus.
        /// </summary>
        Task<ApiResponse<List<MenuViewModel>>> GetAllMenusAsync();
        Task<ApiResponse<PagedResult<MenuViewModel>>> GetAllMenusWithPagePageAsync(SearchRequest request);
        /// <summary>
        /// Asks the main system for details about a specific menu using its ID.
        /// </summary>
        Task<ApiResponse<MenuViewModel>> GetMenuByIdAsync(int id);

        /// <summary>
        /// Sends information to the main system to save or update a menu item.
        /// </summary>
        Task<ApiResponse<bool>> SaveMenuAsync(MenuUpsertRequest request);

        /// <summary>
        /// Tells the main system to turn a menu item on or off.
        /// </summary>
        Task<ApiResponse<bool>> ToggleStatusAsync(StatusUpdateRequest request);

        /// <summary>
        /// Sends a list of menu items with their new display order to the main system.
        /// </summary>
        Task<ApiResponse<bool>> UpdateMenuOrderAsync(List<MenuOrderRequest> orders);

        /// <summary>
        /// Deletes a menu item by ID.
        /// </summary>
        Task<ApiResponse<bool>> DeleteMenuAsync(List<int> id);
    }
}
