using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class EmailTemplateSaveRequest
    {
        public int EmailTemplateId { get; set; }          // 0 = add, >0 = edit
        public int? CompanyID { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? DisplayLabel { get; set; }
        public bool IsActive { get; set; } = true;
        public int UserId { get; set; }
        public string? IPAddress { get; set; }

        // Attachment handling
        //public IFormFile? AttachmentFile { get; set; }     // new / replacement file
        public bool RemoveAttachment { get; set; }         // true = clear existing attachment

        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
    }

    /// <summary>Request for SP_EmailTemplate_UpdateAttachment (path / type / name).</summary>
    public class EmailTemplateAttachmentRequest
    {
        public int EmailTemplateId { get; set; }
        public string? Attachment { get; set; }            // stored path
        public string? AttachmentType { get; set; }        // content type / extension
        public string? AttachmentName { get; set; }        // original file name
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    /// <summary>Maps the result set of SP_EmailTemplate_Upsert (adds EMAILTEMPLATEID).</summary>
    public class EmailTemplateSpResult : SpResult
    {
        public int EmailTemplateId { get; set; }
    }

    /// <summary>Returned by the save method so the client gets the primary id back.</summary>
    public class EmailTemplateSaveResponse : ApiResponse
    {
        public int EmailTemplateId { get; set; }
        public string? Attachment { get; set; }
        public string? AttachmentType { get; set; }
        public string? AttachmentName { get; set; }
    }

    /// <summary>Row model for SP_EmailTemplate_GetAllPageIndex.</summary>
    public class EmailTemplateViewModel
    {
        // paging / status columns
        public int Result { get; set; }
        public string? Message { get; set; }               // 'SUCCESS' / 'NO ... FOUND'
        public int TOTALRECORDS { get; set; }
        public int PageIndex { get; set; }                 // SP returns PAGEINDEX
        public int PageSize { get; set; }

        // data columns
        public int EmailTemplateId { get; set; }
        public string? Title { get; set; }
        public string? EmailMessage { get; set; }          // template body (aliased in SP)
        public string? DisplayLabel { get; set; }
        public int? CompanyID { get; set; }
        public string? Attachment { get; set; }
        public string? AttachmentType { get; set; }
        public string? AttachmentName { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }
    }

    /// <summary>Model for SP_EmailTemplate_GetById (SELECT t.* so column is "Message").</summary>
    public class EmailTemplateDetailViewModel
    {
        public int EmailTemplateId { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public string? DisplayLabel { get; set; }
        public int? CompanyID { get; set; }
        public string? Attachment { get; set; }
        public string? AttachmentType { get; set; }
        public string? AttachmentName { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }
    }

    public class EmailTemplatePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<EmailTemplateViewModel> EmailTemplate { get; set; } = new List<EmailTemplateViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }

        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalRecords / (double)PageSize) : 0;
    }

    public class EmailTemplateAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;

        // null = add mode, populated = edit mode
        public EmailTemplateDetailViewModel? EditEmailTemplate { get; set; }
    }

    public class EmailTempletDropdwon
    {
        public int ID { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public string? Attachment { get; set; }
    }
}
