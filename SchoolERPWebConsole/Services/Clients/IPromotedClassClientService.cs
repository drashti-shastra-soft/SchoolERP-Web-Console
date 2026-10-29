using Microsoft.AspNetCore.Mvc;
using SchoolERPWebConsole.Domain;

namespace SchoolERPWebClient.Services.Clients
{
    public interface IPromotedClassClientService
    {
        Task<ApiResponse<dynamic>> UpsertPromotedClassAsync(PromotedToClassRequest request);
        Task<ApiResponse<dynamic>> DeleteAsync([FromBody] List<int> ids);
        Task<ApiResponse<List<PromotedClassViewModel>>> GetPromotedToClassAsync([FromBody] PromotedToClassGetAllRequest Req);
    }
}
