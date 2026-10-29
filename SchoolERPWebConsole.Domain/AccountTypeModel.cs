using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class AccountTypeModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int AccountTypeId { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string AccountTypeName { get; set; } = string.Empty;
        public string? DisplayLabel { get; set; }
        public string? AccountMessage { get; set; }
        public int? ClosesTo { get; set; }
        public string? ControlNarration { get; set; }
        public bool? Control { get; set; }
        public bool? Summarize { get; set; }
        public bool? Personal { get; set; }
        public string? CDFlag { get; set; }
        public int? PrintOrder { get; set; }
        public bool? IsDelete { get; set; }
        public bool IsActive { get; set; }
        public bool? IsSystem { get; set; }
        public DateTime? CreatedOn { get; set; }
        public int? CreatedBy { get; set; }

        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }
    public class AccountTypeModelRequest
    {
        public int AccountTypeId { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string AccountTypeName { get; set; } = string.Empty;
        public string? DisplayLabel { get; set; }
        public string? Message { get; set; }
        public int? ClosesTo { get; set; }
        public string? ControlNarration { get; set; }
        public bool? Control { get; set; }
        public bool? Summarize { get; set; }
        public bool? Personal { get; set; }
        public string? CDFlag { get; set; }
        public int? PrintOrder { get; set; }

        public bool? IsSystem { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class AccountTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<AccountTypeModel> AccountType { get; set; } = new List<AccountTypeModel>();
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

    public class AccountTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public AccountTypeModel? EditAccountType { get; set; } = new AccountTypeModel();
        public List<DropdownModel>? ClosesToList { get; set; } = new List<DropdownModel>();
    }
}
