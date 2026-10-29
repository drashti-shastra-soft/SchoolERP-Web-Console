using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class MarksFeedingViewModel
    {
        public int MarksFeedingID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int ClassID { get; set; }
        public int SectionID { get; set; }
        public int SubjectID { get; set; }
        public int ExamID { get; set; }
        public int StudentID { get; set; }
        public byte AttendanceStatus { get; set; }
        public decimal? Marks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public string? Grade { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
    }
    public class MarksFeedingRowRequest
    {
        public int StudentID { get; set; }
        public byte AttendanceStatus { get; set; }
        public decimal? Marks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public string? Grade { get; set; }
    }

    public class MarksFeedingRequest
    {
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int ClassID { get; set; }
        public int SectionID { get; set; }
        public int SubjectID { get; set; }
        public int ExamID { get; set; }

        public List<MarksFeedingRowRequest> Rows { get; set; }
            = new List<MarksFeedingRowRequest>();
        public int UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class MarksFeedingGetRequest
    {
        public int CompanyID { get; set; }

        public int SessionID { get; set; }

        public int ClassID { get; set; }

        public int SectionID { get; set; }

        public int SubjectID { get; set; }

        public int ExamID { get; set; }
    }

    public class MarksFeedingResponse
    {
        public int Result { get; set; }

        public string? Message { get; set; }

        public int MarksFeedingID { get; set; }

        public int StudentID { get; set; }

        public string RollNo { get; set; }

        public string? FatherName { get; set; }

        public string? StudentName { get; set; }

        public byte AttendanceStatus { get; set; }

        public decimal? Marks { get; set; }

        public decimal? PracticalMarks { get; set; }

        public string? Grade { get; set; }

        public decimal TheoryMaxMark { get; set; }

        public decimal TheoryMinMark { get; set; }

        public decimal PracticalMaxMark { get; set; }

        public decimal PracticalMinMark { get; set; }
    }

    public class MarksFeedingAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public MarksFeedingViewModel? EditPaperMarksDetails { get; set; } = new MarksFeedingViewModel();
        public List<MstClassViewModel> Class { get; set; } = new();
        public List<MstSectionViewModel> Section { get; set; } = new();
        public List<DropdownModel> Exam { get; set; } = new();
    }
}
