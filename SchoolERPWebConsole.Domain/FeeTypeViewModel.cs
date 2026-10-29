using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class FeeTypeViewModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE

        public int FeeTypeId { get; set; }
        public string FeeTypeName { get; set; }
        public string FeeTypeCode { get; set; }
        public string? DisplayLabel { get; set; }
        // Optional link to Fee Head
        public int? FeeHeadId { get; set; }
        public bool IsRefund { get; set; }
        public bool IsDiscount { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public bool IsActive { get; set; }
        public bool? IsDelete { get; set; }
        public DateTime? CreatedOn { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }

        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class FeeTypeRequest
    {
        public int FeeTypeId { get; set; }

        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public string FeeTypeName { get; set; }

        public string FeeTypeCode { get; set; }

        public string? DisplayLabel { get; set; }

        public int? FeeHeadId { get; set; }

        public bool IsRefund { get; set; } = false;

        public bool IsDiscount { get; set; } = false;

        public bool IsActive { get; set; }

        public int UserId { get; set; }

        public string? IPAddress { get; set; }
    }

    public class FeeTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<FeeTypeViewModel> FeeType { get; set; } = new List<FeeTypeViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public string? CurrencySymbol { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public int? SectionID { get; set; }
        public int? StudentId { get; set; }
    }

    public class FeeTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public FeeTypeViewModel? EditFeeType { get; set; } = new FeeTypeViewModel();
        public List<DropdownModel> FeeHead { get; set; } = new List<DropdownModel>();
    }
}
