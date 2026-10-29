using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{

    public class StudentReExamAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<MstClassViewModel> Class { get; set; } = new();
        public List<MstSectionViewModel> Section { get; set; } = new();
    }

    public class StudentReExamViewModel
    {
        public int? ReExamID { get; set; }
        public int? StudentID { get; set; }
        public string? RollNo { get; set; }
        public string? FatherName { get; set; }
        public string? StudentName { get; set; }
        public bool? IsReExam { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE

    }

    public class StudentReExamRequestModel
    {
        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }
        public int? ClassID { get; set; }
        public int? SectionID { get; set; }
        public int? ExamGroupID { get; set; }
    }

    public class StudentReExamGetList
    {
        public int? ClassID { get; set; }
        public int? ExamGroupID { get; set; }
        public int? ExamID { get; set; }
        public int? SectionID { get; set; }
    }

    public class StudentReExamRow
    {
        public int StudentID { get; set; }

        public string? RollNo { get; set; }

        public bool IsReExam { get; set; }
    }

    public class StudentReExamRequest
    {
        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public int ClassID { get; set; }

        public int SectionID { get; set; }

        public int ExamGroupID { get; set; }

        public List<StudentReExamRow> Rows { get; set; }
            = new List<StudentReExamRow>();

        public int UserId { get; set; }

        public string? IPAddress { get; set; }
    }
}
