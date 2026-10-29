using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class CoScholasticViewModel
    {
        public int CoScholasticID { get; set; }
        public int? ParentID { get; set; }
        public int CompanyID { get; set; }
        public int? SrNo { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsGroup { get; set; }
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

    public class CoScholasticRequest
    {
        public int CoScholasticID { get; set; }
        public int? ParentID { get; set; }
        public int CompanyID { get; set; }
        public int? SrNo { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsGroup { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class CoScholasticPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<CoScholasticViewModel> CoScholastic { get; set; } = new List<CoScholasticViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalPages => PageSize > 0
                             ? (int)Math.Ceiling((double)TotalRecords / PageSize)
                             : 0;

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
    }

    public class CoScholasticAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public CoScholasticViewModel? EditCoScholastic { get; set; } = new CoScholasticViewModel();
        public List<CoScholasticViewModel> ParentGroups { get; set; } = new List<CoScholasticViewModel>();
    }

    public class CoScholasticSearchRequest
    {
        public int CompanyID { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SearchTerm { get; set; }
        public int? ParentID { get; set; }
        public bool? IsActive { get; set; }
        public string SortColumn { get; set; } = "SrNo";
        public string SortDirection { get; set; } = "ASC";
    }
}
