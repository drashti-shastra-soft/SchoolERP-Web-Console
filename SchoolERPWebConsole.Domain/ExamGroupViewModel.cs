using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class ExamGroupViewModel
    {
        public int ExamGroupId { get; set; }
        public string? ExamGroupName { get; set; }
        public string? ExamGroupShortCode { get; set; }
        public string? DisplayLabel { get; set; }
        public string? Description { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public bool IsActive { get; set; }
        public bool? IsDelete { get; set; }
        public DateTime? CreatedOn { get; set; }
        public int? CreatedBy { get; set; }
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

    public class ExamGroupRequestModel
    {
        public int ExamGroupID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string ExamGroupName { get; set; } = string.Empty;
        public string ExamGroupShortCode { get; set; } = string.Empty;
        public string DisplayLabel { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int UserID { get; set; }
        public string? IPAddress { get; set; }
    }

    public class ExamGroupPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ExamGroupViewModel> Exam { get; set; } = new List<ExamGroupViewModel>();
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

    public class ExamGroupAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public ExamGroupViewModel? EditExam { get; set; } = new ExamGroupViewModel();
    }
}
