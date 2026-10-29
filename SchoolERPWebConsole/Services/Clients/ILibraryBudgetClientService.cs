using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// Defines API client operations for managing library budgets.
    /// </summary>
    public interface ILibraryBudgetClientService
    {
        /// <summary>
        /// Creates or updates a library budget via the API.
        /// </summary>
        /// <param name="request">The library budget request data.</param>
        /// <returns>API response containing the operation status.</returns>
        Task<ApiResponse<SpResult>> UpsertLibraryBudgetAsync(LibraryBudgetRequest request);

        /// <summary>
        /// Retrieves a library budget record by its identifier via the API.
        /// </summary>
        /// <param name="id">The unique identifier of the budget.</param>
        /// <returns>API response containing the library budget details.</returns>
        Task<ApiResponse<LibraryBudgetModel>> GetByIDAsync(int id);

        /// <summary>
        /// Retrieves a paginated list of library budgets based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of library budgets.</returns>
        Task<ApiResponse<PagedResult<LibraryBudgetModel>>> GetAllLibraryBudgetWithPageAsync(SearchRequest request);

        /// <summary>
        /// Deletes one or more library budgets by ID.
        /// </summary>
        /// <param name="ids">List of library budget identifiers to delete.</param>
        /// <returns>API response containing the operation outcome status.</returns>
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);

        /// <summary>
        /// Toggles the active/inactive status of a library budget.
        /// </summary>
        /// <param name="request">Status update request details.</param>
        /// <returns>API response containing the operation outcome status.</returns>
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);

        /// <summary>
        /// Retrieves the list of budget for the specified company.
        /// This method calls the Library API and returns all matching budget.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="includdeleted">Optional includdeleted.</param>
        /// <returns>A collection of budget.</returns>
        Task<ApiResponse<List<LibraryBudgetModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted);

        Task<ApiResponse<SpResult>> CopyLibraryBudgetAsync(CopyForCompanyRequest request);

        Task<ApiResponse<PagedResult<LibraryBudgetModel>>> GetLibraryBudgetChartDataAsync(SearchRequest request);
    }
}
