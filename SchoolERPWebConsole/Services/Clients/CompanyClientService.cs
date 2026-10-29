using SchoolERPWebConsole.Domain;
using System.Net.Http.Headers;

namespace SchoolERPWebConsole.Services.Clients
{
    /// <summary>
    /// This service handles the actual work of sending requests to the main system to manage school company details in the database via an API.
    /// </summary>
    public class CompanyClientService : BaseApiClient, ICompanyClientService
    {
        public CompanyClientService(HttpClient httpClient) : base(httpClient)
        {
        }

        /// <summary>
        /// Sends a request to the server to get a list of all school companies.
        /// </summary>
        public async Task<ApiResponse<List<MstCompanyViewModel>>> GetAllAsync(bool includeDeleted = false)
        {
            return await GetAsync<List<MstCompanyViewModel>>($"api/CompanyApi/GetAll?includeDeleted={includeDeleted}");
        }
        public async Task<ApiResponse<PagedResult<MstCompanyViewModel>>> GetAllCompanyWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<MstCompanyViewModel>>("api/CompanyApi/GetAllCompanyWithPage", request);
        }
        /// <summary>
        /// Sends a request to the server to get a list of school companies assigned to the current user.
        /// </summary>
        public async Task<ApiResponse<List<MstCompanyViewModel>>> GetAssignedCompaniesAsync()
        {
            return await GetAsync<List<MstCompanyViewModel>>("api/CompanyApi/GetAssignedCompanies");
        }

        /// <summary>
        /// Sends a request to the server to look up details for a specific company by its ID.
        /// </summary>
        public async Task<ApiResponse<MstCompanyViewModel>> GetByIDAsync(int id)
        {
            return await GetAsync<MstCompanyViewModel>($"api/CompanyApi/GetByID/{id}");
        }

        /// <summary>
        /// Sends company details to the server to be saved or updated.
        /// </summary>
        public async Task<ApiResponse<dynamic>> UpsertAsync(MstCompanyUpsertRequest request)
        {
            return await PostAsync<dynamic>("api/CompanyApi/Upsert", request);
        }
        /// <summary>
        /// Sends company image and logo to the server to be saved or updated.
        /// </summary>
        public async Task<ApiResponse<dynamic>> UpdateCompanyImageAsync(int companyId, string imageType, IFormFile file)
        {
            using var content = new MultipartFormDataContent();
            content.Add(new StringContent(companyId.ToString()), "companyId");
            content.Add(new StringContent(imageType), "imageType");

            if (file != null && file.Length > 0)
            {
                var fileContent = new StreamContent(file.OpenReadStream());
                fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
                content.Add(fileContent, "file", file.FileName);
            }

            var response = await _httpClient.PostAsync("api/CompanyApi/UpdateCompanyImage", content);
            return await response.Content.ReadFromJsonAsync<ApiResponse<dynamic>>();
        }




        /// <summary>
        /// Sends a request to the server to delete a company record.
        /// </summary>
        public async Task<ApiResponse<dynamic>> DeleteAsync(List<int> id)
        {
            return await PostAsync<dynamic>($"api/CompanyApi/Delete", id);
        }

        /// <summary>
        /// Sends a request to the server to update whether a company is currently active.
        /// </summary>
        public async Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request)
        {
            return await PostAsync<dynamic>($"api/CompanyApi/ToggleStatus", request);
        }

        /// <summary>
        /// Sends a request to the server to save the user's preferred active school company.
        /// </summary>
        public async Task<ApiResponse<dynamic>> SetCurrentCompanyAsync(SetCurrentCompanyRequest request)
        {
            return await PostAsync<dynamic>("api/CompanyApi/SetCurrent", request);
        }

        /// <summary>
        /// Sends a request to the server to find out which school company the user is currently working with.
        /// </summary>
        public async Task<ApiResponse<int?>> GetUserCurrentCompanyAsync()
        {
            return await GetAsync<int?>("api/CompanyApi/GetUserCurrentCompany");
        }

        public async Task<ApiResponse<AttendanceCountModel>> GetStudentAttendanceCountAsync(ReqAttendanceCountModel req)
        {
            return await PostAsync<AttendanceCountModel>($"api/DashboardApi/GetStudentAttendanceCount", req);
        }


        public async Task<ApiResponse<List<UserRoleWiseCountModel>>> GetUserRoleWiseCountAsync(int companyId, int sessionId)
        {
            return await GetAsync<List<UserRoleWiseCountModel>>($"api/DashboardApi/GetUserRoleWiseCount?companyId={companyId}&sessionId={sessionId}");
        }

        public async Task<ApiResponse<dynamic>> SaveCompanyLogosAsync(CompanyLogoRequest request)
        {
            return await PostAsync<dynamic>("api/CompanyApi/SaveCompanyLogos", request);
        }

        public async Task<ApiResponse<List<CompanyLogoResponse>>> GetAllCompanyLogoByIdAsync(int companyId)
        {
            return await GetAsync<List<CompanyLogoResponse>>($"api/DashboardApi/GetAllCompanyLogoById?companyId={companyId}");
        }
    }
}
