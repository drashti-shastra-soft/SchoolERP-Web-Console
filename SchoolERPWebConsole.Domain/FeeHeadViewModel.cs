using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class FeeHeadViewModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE


        public int FeeHeadId { get; set; }

        public string FeeHeadName { get; set; }

        public string? DisplayLabel { get; set; }

        // Link with Account Name
        public int AccountId { get; set; }

        // Fee Type
        public int FeeTypeId { get; set; }

        public bool IsRefunded { get; set; }

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
    public class FeeHeadRequest
    {
        public int FeeHeadId { get; set; }

        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public string FeeHeadName { get; set; }

        public string? DisplayLabel { get; set; }

        public int AccountId { get; set; }

        public int FeeTypeId { get; set; }

        public bool IsRefunded { get; set; } = false;

        public bool IsActive { get; set; }

        public int UserId { get; set; }

        public string? IPAddress { get; set; }
    }

    public class FeeHeadPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<FeeHeadViewModel> FeeHead { get; set; } = new List<FeeHeadViewModel>();
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
    }

    public class FeeHeadAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public FeeHeadViewModel? EditFeeHead { get; set; } = new FeeHeadViewModel();
        public List<DropdownModel> FeeCategory { get; set; } = new List<DropdownModel>();
        public List<DropdownModel> AccountType { get; set; } = new List<DropdownModel>();
    }
}
