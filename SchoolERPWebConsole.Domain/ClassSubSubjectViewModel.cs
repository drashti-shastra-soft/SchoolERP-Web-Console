using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class ClassSubSubjectViewModel
    {
        public int ClassSubSubjectID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int ClassID { get; set; }
        public int SubjectID { get; set; }
        public int SubSubjectID { get; set; }
        public int Sequence { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }

        public string? ClassName { get; set; }
        public string? SubjectName { get; set; }
        public string? SubSubject { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class ClassSubSubjectRequest
    {
        public int ClassSubSubjectID { get; set; }

        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public int ClassID { get; set; }

        public int SubjectID { get; set; }

        public int SubSubjectID { get; set; }
        public int Sequence { get; set; }

        public bool IsActive { get; set; }

        public int UserId { get; set; }

        public string? IPAddress { get; set; }
    }

    public class ClassSubSubjectPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ClassSubSubjectViewModel> ClassSubSubjects { get; set; } = new List<ClassSubSubjectViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstClassViewModel> Classes { get; set; } = new();
        public List<Dropdowbinding> Subjects { get; set; } = new();

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

    public class ClassSubSubjectAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public ClassSubSubjectViewModel? EditClassSubSubject { get; set; } = new ClassSubSubjectViewModel();
        public List<MstClassViewModel> Classes { get; set; } = new();
        public List<Dropdowbinding> Subjects { get; set; } = new();
        public List<DropdownModel> SubSubjects { get; set; } = new();
    }
}
