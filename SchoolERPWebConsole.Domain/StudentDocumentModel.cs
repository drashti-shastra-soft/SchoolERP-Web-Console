namespace SchoolERPWebConsole.Domain
{
    public class StudentDocumentModel
    {
        public int Result { get; set; }
        public string? Message { get; set; }
        public int DocID { get; set; }
        public int StudentID { get; set; }
        public string DocumentTitle { get; set; } = string.Empty;
        public string DocumentContent { get; set; } = string.Empty; // original filename
        public string DocumentPath { get; set; } = string.Empty;    // saved file path/URL
        public string DocumentType { get; set; } = string.Empty;    // filename or extension
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }
    }

    public class StudentUserModel
    {
        public int StudentID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string? PersonType { get; set; }
        public int UserID { get; set; }
        public string? UserName { get; set; }
        public int UserTypeID { get; set; }
        public string? UserTypeCode { get; set; }
        public string? UserType { get; set; }
        public string? Password { get; set; }
        public bool UserIsActive { get; set; }
        public bool? UserIsLocked { get; set; }
    }
}
