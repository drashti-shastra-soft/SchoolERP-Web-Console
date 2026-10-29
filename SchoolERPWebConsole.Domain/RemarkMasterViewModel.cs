using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class RemarkMasterViewModel
    {
        public int RemarkID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int RemarkGroupID { get; set; }
        public string Remark { get; set; } = string.Empty;
        public string RemarkGroupName { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class RemarkMasterRequest
    {
        public int RemarkID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int RemarkGroupID { get; set; }
        public string Remark { get; set; } = string.Empty;
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; }
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class RemarkPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<RemarkMasterViewModel> Remark { get; set; } = new List<RemarkMasterViewModel>();
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

    public class RemarkAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public RemarkMasterViewModel? EditRemark { get; set; } = new RemarkMasterViewModel();
        public List<DropdownModel> RemarkGroup { get; set; } = new();
    }
}
