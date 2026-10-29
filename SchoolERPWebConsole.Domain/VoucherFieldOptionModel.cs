using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class VoucherFieldOptionModel
    {
        public int OptionID { get; set; }
        public int? CompanyID { get; set; }
        public int FieldID { get; set; }
        public string? OptionLabel { get; set; }
        public string? OptionValue { get; set; }
        public int? DisplayOrder { get; set; }
        public bool? IsDefault { get; set; }
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

    public class VoucherFieldOptionRequest
    {
        public int OptionID { get; set; }
        public int? CompanyID { get; set; }
        public int FieldID { get; set; }
        public string? OptionLabel { get; set; }
        public string? OptionValue { get; set; }
        public int? DisplayOrder { get; set; }
        public bool? IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class VoucherFieldOptionPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<VoucherFieldOptionModel> VoucherFieldOption { get; set; } = new List<VoucherFieldOptionModel>();
        public List<VoucherTypeModel> VoucherType { get; set; } = new List<VoucherTypeModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }

    public class VoucherFieldOptionAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public VoucherFieldOptionModel? EditVoucherFieldOption { get; set; } = new VoucherFieldOptionModel();
        public List<DropdownModel> Field { get; set; } = new List<DropdownModel>();
    }
    public class VoucherFieldOptionResponse
    {
        public string? OptionValue { get; set; }

        public string? OptionLabel { get; set; }
    }

}
