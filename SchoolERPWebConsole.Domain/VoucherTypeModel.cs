using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class VoucherTypeModel
    {
        public int VoucherId { get; set; }
        public string? VoucherType { get; set; }
        public string? ShortCode { get; set; }
        public string? DisplayLabel { get; set; }
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
    public class VoucherTypeModelRequest
    {
        public int VoucherId { get; set; }
        public string? VoucherType { get; set; }
        public string? ShortCode { get; set; }
        public string? DisplayLabel { get; set; }

        public bool IsActive { get; set; }
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class VoucherTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<VoucherTypeModel> VoucherType { get; set; } = new List<VoucherTypeModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }

    public class VoucherTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public VoucherTypeModel? EditVoucherType { get; set; } = new VoucherTypeModel();
    }
}
