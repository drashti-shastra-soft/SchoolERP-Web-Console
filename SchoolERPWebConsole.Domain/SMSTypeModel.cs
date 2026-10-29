using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class SMSTypeModel
    {
        public int SMSTypeId { get; set; }
        public string? SMSType { get; set; }
        public string? LogoUrl { get; set; }
        public string? WebsiteUrl { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsSystemPayment { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class SMSTypeRequest
    {
        public int SMSTypeId { get; set; }
        public string? SMSType { get; set; }
        public string? LogoUrl { get; set; }
        public string? WebsiteUrl { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public bool IsSystemPayment { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public int? UserId { get; set; }
        public string? IPAddress { get; set; }
        public string? ExistingFileName { get; set; }   // added
        public bool RemoveAttachment { get; set; }       // added
    }

    public class SMSTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<SMSTypeModel> SMSType { get; set; } = new List<SMSTypeModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }

    public class SMSTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public SMSTypeModel? EditSMSType { get; set; } = new SMSTypeModel();
    }

    public class SMSTypeAttachmentUpsertRequest
    {
        public int SMSTypeId { get; set; }
        public string? LogoUrl { get; set; }
    }
    public class UpsertSMSTypeResponse
    {
        public SpSMSType Result { get; set; }
    }
}
