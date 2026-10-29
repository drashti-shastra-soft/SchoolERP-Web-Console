using System;
using System.Collections.Generic;

namespace SchoolERPWebConsole.Domain
{
    /// <summary>
    /// One SMS template row (list + edit). Also carries the status columns the SPs return.
    /// </summary>
    public class SMSTemplateViewModel
    {
        public int SMSTemplateId { get; set; }
        public string Title { get; set; } = string.Empty;

        // Template text. The SPs alias tbl_Mst_SMSTemplate.Message AS SMSMessage
        // so it doesn't collide with the MESSAGE status column below.
        public string SMSMessage { get; set; } = string.Empty;
        public string? DisplayLabel { get; set; }

        public int? CompanyID { get; set; }

        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }

        public DateTime? CreatedOn { get; set; }
        public int? CreatedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }

        // ---- SP status columns ----
        public int Result { get; set; }                    // RESULT  (1 = success, 0 = failure)
        public string Message { get; set; } = string.Empty; // MESSAGE (status text, NOT the SMS text)

        // ---- Paging columns returned by SP_SMSTemplate_GetAllPageIndex ----
        public int TOTALRECORDS { get; set; }   // TOTALRECORDS
        public int PAGEINDEX { get; set; }      // PAGEINDEX
        public int CURRENTPAGE { get; set; }    // kept for existing code that reads it
        public int PageSize { get; set; }       // PAGESIZE
        public int TotalPages { get; set; }     // not returned by the SP; computed in the page model
    }

    /// <summary>
    /// Payload posted to /SMSTemplate/Save and passed to SP_SMSTemplate_Upsert.
    /// Here Message IS the SMS text (maps to @Message).
    /// </summary>
    public class SMSTemplateSaveRequest
    {
        public int SMSTemplateId { get; set; } = 0;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? DisplayLabel { get; set; }
        public int? CompanyID { get; set; }
        public bool IsActive { get; set; } = true;
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class SMSTemplatePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<SMSTemplateViewModel> SMSTemplate { get; set; } = new List<SMSTemplateViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }

        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalRecords / (double)PageSize) : 0;
    }

    public class SMSTemplateAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;

        // null = add mode, populated = edit mode
        public SMSTemplateViewModel? EditSMSTemplate { get; set; }
    }
}