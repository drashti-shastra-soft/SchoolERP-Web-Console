using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class LibraryBudgetClientService:BaseApiClient, ILibraryBudgetClientService
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="LibraryBudgetClientService"/> class.
        /// </summary>
        /// <param name="client">The HTTP client instance used for API requests.</param>
        public LibraryBudgetClientService(HttpClient client) : base(client) { }

        /// <summary>
        /// Creates or updates a library budget via the API.
        /// </summary>
        /// <param name="request">The library budget request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> UpsertLibraryBudgetAsync(LibraryBudgetRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryBudgetAPI/Save", request);
        }
        /// <summary>
        /// Retrieves a library budget record by its identifier via the API.
        /// </summary>
        /// <param name="id">The unique identifier of the budget.</param>
        /// <returns>API response containing the library budget details.</returns>
        public async Task<ApiResponse<LibraryBudgetModel>> GetByIDAsync(int id)
        {
            return await GetAsync<LibraryBudgetModel>($"api/LibraryBudgetAPI/GetById/{id}");
        }
        /// <summary>
        /// Retrieves a paginated list of library budgets based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of library budgets.</returns>
        public async Task<ApiResponse<PagedResult<LibraryBudgetModel>>> GetAllLibraryBudgetWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryBudgetModel>>("api/LibraryBudgetAPI/GetAllLibraryBudgetWithPage", request);
        }
        /// <summary>
        /// Retrieves a paginated list of library budgets based on the search criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination options request.</param>
        /// <returns>API response containing a paginated list of library budgets.</returns>
        
        public async Task<ApiResponse<PagedResult<LibraryBudgetModel>>> GetLibraryBudgetChartDataAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<LibraryBudgetModel>>(
                "api/LibraryBudgetAPI/GetAllLibraryBudgetWithPage", request);
        }
        /// <summary>
        /// Deletes one or more library budgets by ID.
        /// </summary>
        /// <param name="ids">List of library budget identifiers to delete.</param>
        /// <returns>API response containing the operation outcome status.</returns>
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids)
        {
            return await PostAsync<dynamic>($"api/LibraryBudgetAPI/Delete", ids);
        }

        /// <summary>
        /// Toggles the active/inactive status of a library budget.
        /// </summary>
        /// <param name="request">Status update request details.</param>
        /// <returns>API response containing the operation outcome status.</returns>
        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/LibraryBudgetAPI/ToggleStatus", request);
        }

        /// <summary>
        /// Retrieves the list of budget for the specified company.
        /// This method calls the Library API and returns all matching budget.
        /// </summary>
        /// <param name="companyId">The company identifier.</param>
        /// <param name="includdeleted">Optional includdeleted.</param>
        /// <returns>A collection of budget.</returns>
        public async Task<ApiResponse<List<LibraryBudgetModel>>> GetAllAsync(
            int companyId,
            bool? includdeleted)
        {
            return await GetAsync<List<LibraryBudgetModel>>(
                $"api/LibraryBudgetAPI/GetAll?companyId={companyId}&includdeleted={includdeleted}");
        }

        /// <summary>
        /// Creates or updates a library budget via the API.
        /// </summary>
        /// <param name="request">The library budget request data.</param>
        /// <returns>API response containing the operation status.</returns>
        public async Task<ApiResponse<SpResult>> CopyLibraryBudgetAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/LibraryBudgetAPI/CopyLibraryBudget", request);
        }
    }
}
