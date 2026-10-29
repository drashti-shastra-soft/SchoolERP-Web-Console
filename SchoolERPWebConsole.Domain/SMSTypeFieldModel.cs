using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class SMSTypeFieldModel
    {
        public int FieldID { get; set; }
        public int SMSTypeId { get; set; }
        public string? FieldKey { get; set; }
        public string? FieldLabel { get; set; }
        public string? FieldType { get; set; }
        public bool? IsRequired { get; set; }
        public bool? IsSecret { get; set; }
        public int? DisplayOrder { get; set; }
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
    public class SMSFieldRequest
    {
        public int FieldID { get; set; } = 0;
        public int SMSTypeId { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string FieldLabel { get; set; } = string.Empty;
        public string FieldType { get; set; } = "TEXT";
        public bool IsRequired { get; set; } = true;
        public bool IsSecret { get; set; } = false;
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class SMSTypeFieldPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<SMSTypeFieldModel> SMSTypeField { get; set; } = new List<SMSTypeFieldModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }

    public class SMSTypeFieldAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public SMSTypeFieldModel? EditSMSTypeField { get; set; } = new SMSTypeFieldModel();
        public List<DropdownModel> SMSType { get; set; } = new List<DropdownModel>();
    }
}
