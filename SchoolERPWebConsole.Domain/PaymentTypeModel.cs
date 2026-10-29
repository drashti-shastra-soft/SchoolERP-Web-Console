using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class PaymentTypeModel
    {
        public int PaymentTypeId { get; set; }
        public string? PaymentType { get; set; }
        public string? PaymentCode { get; set; }
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

    public class PaymentTypeRequest
    {
        public int PaymentTypeId { get; set; } = 0;
        public string PaymentType { get; set; } = string.Empty;
        public string? PaymentCode { get; set; }
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

    public class PaymentTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<PaymentTypeModel> PaymentType { get; set; } = new List<PaymentTypeModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }

    public class PaymentTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public PaymentTypeModel? EditPaymentType { get; set; } = new PaymentTypeModel();
    }

    public class UpsertPaymentTypeResponse
    {
        public SpPaymentType Result { get; set; }
    }
    public class PaymentTypeAttachmentUpsertRequest
    {
        public int PaymentTypeId { get; set; }
        public string? LogoUrl { get; set; }
    }
}
