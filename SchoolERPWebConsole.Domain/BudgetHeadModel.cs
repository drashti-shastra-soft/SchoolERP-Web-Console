using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class BudgetHeadModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int BudgetHeadId { get; set; }

        public string? BudgetName { get; set; }

        public string? DisplayLabel { get; set; }

        public decimal? BudgetLimit { get; set; }

        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public bool IsActive { get; set; }

        public bool? IsDelete { get; set; }

        public DateTime? CreatedOn { get; set; }

        public int? CreatedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int? ModifiedBy { get; set; }
        public string? CurrencySymbol { get; set; } = string.Empty;
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class BudgetHeadModelRequest
    {
        public int? BudgetHeadId { get; set; }
        public string? BudgetName { get; set; }
        public string? DisplayLabel { get; set; }
        public decimal? BudgetLimit { get; set; }
        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }

        public bool IsActive { get; set; }
        public int? UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class BudgetHeadPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<BudgetHeadModel> BudgetHead { get; set; } = new List<BudgetHeadModel>();
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

    public class BudgetHeadAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public BudgetHeadModel? EditBudgetHead { get; set; } = new BudgetHeadModel();
    }
}
