using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface INoticeBoardClientService
    {
        Task<ApiResponse<NoticeBoardSaveResponse>> UpsertNoticeBoardAsync(NoticeBoardRequestModel request);
        Task<ApiResponse<NoticeBoardModel>> GetByIDAsync(int id);
        Task<ApiResponse<PagedResult<NoticeBoardModel>>> GetAllNoticeBoardWithPageAsync(NoticeBoardSearchRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync(List<int> ids);
        Task<ApiResponse<dynamic>> ToggleStatusAsync(StatusUpdateRequest request);
        Task<ApiResponse<SpResult>> UpdateNoticeBoardAttachmentAsync(NoticeBoardAttachmentRequest request);
    }
}
