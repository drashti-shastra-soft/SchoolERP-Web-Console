using SchoolERPWebConsole.Domain;

namespace SchoolERPWebConsole.Services.Clients
{
    public class DownloadCenterClientService:BaseApiClient, IDownloadCenterClientService
    {
        public DownloadCenterClientService(HttpClient httpClient) : base(httpClient) { }

        /// <summary>
        /// Retrieves all content types.
        /// This method is used to populate content type dropdowns,
        /// grids, and search results.
        /// </summary>
        /// <param name="searchTerm">
        /// Optional text used to filter content types.
        /// </param>
        /// <returns>
        /// A collection of content type records.
        /// </returns>
        public async Task<ApiResponse<List<ContentTypeViewModel>>> GetContentTypeList(string? searchTerm = null, int? companyId=null)
        {
            return await GetAsync<List<ContentTypeViewModel>>(
                $"api/DownloadCenter/GetContentTypeList?searchTerm={Uri.EscapeDataString(searchTerm ?? string.Empty)}&companyId={companyId}");
        }
        public async Task<ApiResponse<PagedResult<ContentTypeViewModel>>> GetAllContentTypeWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<ContentTypeViewModel>>("api/DownloadCenter/GetAllContentTypeWithPage", request);
        }

        public async Task<ApiResponse<SpResult>> CopyContentTypeAsync(CopyForCompanyRequest request)
        {
            return await PostAsync<SpResult>("api/DownloadCenter/CopyContentType", request);
        }
        /// <summary>
        /// Retrieves detailed information for a specific content type.
        /// This method is used when editing or viewing a content type.
        /// </summary>
        /// <param name="id">
        /// The content type identifier.
        /// </param>
        /// <returns>
        /// The requested content type details.
        /// </returns>
        public async Task<ApiResponse<ContentTypeViewModel>> GetContentTypeById(int id)
        {
            return await GetAsync<ContentTypeViewModel>(
                $"api/DownloadCenter/GetContentTypeById?id={id}");
        }

        /// <summary>
        /// Creates a new content type or updates an existing content type.
        /// This method is used from Add and Edit screens.
        /// </summary>
        /// <param name="request">
        /// The content type details to save.
        /// </param>
        /// <returns>
        /// A response indicating whether the save operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> UpsertContentTypeAsync(ContentTypeUpsertRequest request)
        {
            return await PostAsync<bool>(
               $"api/DownloadCenter/UpsertContentType",
                request);
        }

        /// <summary>
        /// Deletes a content type record.
        /// This method is typically called from the content type listing page.
        /// </summary>
        /// <param name="id">
        /// The identifier of the content type to delete.
        /// </param>
        /// <returns>
        /// A response indicating whether the delete operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> DeleteContentType(List<int> id)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/DeleteContentType",id);
        }
        /// <summary>
        /// Changes the active or inactive status of a content type.
        /// This method is commonly used from the content type listing page.
        /// </summary>
        /// <param name="id">
        /// The identifier of the content type.
        /// </param>
        /// <returns>
        /// A response indicating whether the status change succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> ToggleContentTypeStatus(StatusUpdateRequest request)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/ToggleContentTypeStatus", request);
        }
        /// <summary>
        /// Retrieves video tutorials based on the supplied filters.
        /// This method is used to populate the video tutorial grid or listing page.
        /// </summary>
        /// <param name="classId">
        /// Optional class identifier.
        /// </param>
        /// <param name="sectionId">
        /// Optional section identifier.
        /// </param>
        /// <param name="searchTerm">
        /// Optional search text.
        /// </param>
        /// <returns>
        /// A collection of video tutorial records.
        /// </returns>
        public async Task<ApiResponse<List<VideoTutorialViewModel>>> GetVideoTutorialList(
            int? classId = null,
            int? sectionId = null,
            string? searchTerm = null)
        {
            return await GetAsync<List<VideoTutorialViewModel>>(
                $"api/DownloadCenter/GetVideoTutorialList" +
                $"?classId={classId}" +
                $"&sectionId={sectionId}" +
                $"&searchTerm={Uri.EscapeDataString(searchTerm ?? string.Empty)}");
        }
        public async Task<ApiResponse<PagedResult<VideoTutorialViewModel>>> GetAllVideoTutoriaWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<VideoTutorialViewModel>>("api/DownloadCenter/GetAllVideoTutoriaWithPage", request);
        }
        /// <summary>
        /// Retrieves detailed information for a specific video tutorial.
        /// This method is typically used on Edit and View pages.
        /// </summary>
        /// <param name="id">
        /// The video tutorial identifier.
        /// </param>
        /// <returns>
        /// The requested video tutorial details.
        /// </returns>
        public async Task<ApiResponse<VideoTutorialViewModel>> GetVideoTutorialById(int id)
        {
            return await GetAsync<VideoTutorialViewModel>(
                $"api/DownloadCenter/GetVideoTutorialById?id={id}");
        }

        /// <summary>
        /// Creates a new video tutorial or updates an existing video tutorial.
        /// This method is used from Add and Edit video tutorial screens.
        /// </summary>
        /// <param name="request">
        /// The video tutorial information to save.
        /// </param>
        /// <returns>
        /// A response indicating whether the save operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> UpsertVideoTutorial(
            VideoTutorialUpsertRequest request)
        {
            return await PostAsync<bool>(
                "api/DownloadCenter/UpsertVideoTutorial",
                request);
        }
        /// <summary>
        /// Deletes a video tutorial.
        /// This method is typically used from the video tutorial listing page.
        /// </summary>
        /// <param name="id">
        /// The video tutorial identifier.
        /// </param>
        /// <returns>
        /// A response indicating whether the delete operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> DeleteVideoTutorial(List<int> id)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/DeleteVideoTutorial",id);
        }

        /// <summary>
        /// Activates or deactivates a video tutorial.
        /// This method is used from the video tutorial management screen.
        /// </summary>
        /// <param name="id">
        /// The video tutorial identifier.
        /// </param>
        /// <returns>
        /// A response indicating whether the status update succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> ToggleVideoTutorialStatus(StatusUpdateRequest request)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/ToggleVideoTutorialStatus", request);
        }
        /// <summary>
        /// Retrieves uploaded content records.
        /// This method is used to populate the uploaded content grid.
        /// </summary>
        /// <param name="searchTerm">
        /// Optional search text.
        /// </param>
        /// <returns>
        /// A collection of uploaded content records.
        /// </returns>
        public async Task<ApiResponse<List<ContentViewModel>>> GetContentList(string? searchTerm = null)
        {
            return await GetAsync<List<ContentViewModel>>(
                $"api/DownloadCenter/GetContentList?searchTerm={Uri.EscapeDataString(searchTerm ?? string.Empty)}");
        }

        public async Task<ApiResponse<PagedResult<ContentViewModel>>> GetAllContentWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<ContentViewModel>>("api/DownloadCenter/GetAllContentWithPage", request);
        }

        /// <summary>
        /// Deletes a downloadable content record.
        /// This method is typically called from the content listing page.
        /// </summary>
        /// <param name="id">
        /// The content identifier.
        /// </param>
        /// <returns>
        /// A response indicating whether the delete operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> DeleteContent(int id)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/DeleteContent?id={id}",
                new { });
        }

        /// <summary>
        /// Generates a shareable link for downloadable content.
        /// This method creates a unique token that can be shared with users.
        /// </summary>
        /// <param name="request">
        /// Shared link details including title, validity dates, and content IDs.
        /// </param>
        /// <returns>
        /// A response containing the generated share token.
        /// </returns>
        public async Task<ApiResponse<string>> GenerateSharedLink(SharedLinkUpsertRequest request)
        {
            return await PostAsync<string>(
                "api/DownloadCenter/GenerateSharedLink",
                request);
        }
        public async Task<ApiResponse<GenerateSharedLinkResult>> GenerateWithSendTypeSharedLinkWith(GenerateSharedLinkRequest request)
        {
            return await PostAsync<GenerateSharedLinkResult>(
                "api/DownloadCenter/GenerateWithSendTypeSharedLinkWith",
                request);
        }
        /// <summary>
        /// Retrieves all generated shared links.
        /// This method is used to display shared link history and management screens.
        /// </summary>
        /// <returns>
        /// A collection of shared link records.
        /// </returns>
        public async Task<ApiResponse<List<SharedLinkViewModel>>> GetSharedLinkList()
        {
            return await GetAsync<List<SharedLinkViewModel>>(
                "api/DownloadCenter/GetSharedLinkList");
        }

        public async Task<ApiResponse<PagedResult<SharedLinkViewModel>>> GetAllSharedLinkWithPageAsync(SearchRequest request)
        {
            return await PostAsync<PagedResult<SharedLinkViewModel>>("api/DownloadCenter/GetAllSharedLinkWithPage", request);
        }

        /// <summary>
        /// Deletes a shared link.
        /// This method removes the shared link and prevents future access using that link.
        /// </summary>
        /// <param name="id">
        /// The shared link identifier.
        /// </param>
        /// <returns>
        /// A response indicating whether the delete operation succeeded.
        /// </returns>
        public async Task<ApiResponse<bool>> DeleteSharedLink(List<int> id)
        {
            return await PostAsync<bool>(
                $"api/DownloadCenter/DeleteSharedLink",id);
        }

        /// <summary>
        /// Saves uploaded content.
        /// </summary>
        public Task<ApiResponse<dynamic>> SaveUploadContentAsync(
     string title,
     int typeId,
     string? fileType,
     string? fileName,
     string? filePath,
     string? fileSize,
     int companyId)
        {
            return PostAsync<dynamic>(
                $"api/DownloadCenter/SaveUploadContent" +
                $"?title={Uri.EscapeDataString(title ?? string.Empty)}" +
                $"&typeId={typeId}" +
                $"&fileType={Uri.EscapeDataString(fileType ?? string.Empty)}" +
                $"&fileName={Uri.EscapeDataString(fileName ?? string.Empty)}" +
                $"&filePath={Uri.EscapeDataString(filePath ?? string.Empty)}" +
                $"&fileSize={Uri.EscapeDataString(fileSize ?? string.Empty)}" +
                $"&companyId={companyId}",
                null);
        }
    }
}
