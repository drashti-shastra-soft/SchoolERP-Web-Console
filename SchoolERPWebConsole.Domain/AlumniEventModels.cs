namespace SchoolERPWebConsole.Domain
{
    public class AlumniEventViewModel
    {
        public int EventID { get; set; }
        public string? EventTitle { get; set; }
        public string? EventDescription { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string? Location { get; set; }
        public string? EventPhoto { get; set; }
        public string? EventPhotoName { get; set; }
        public string? EventPhotoType { get; set; }
        public int HasPhoto { get; set; }
        public int EventFor { get; set; }
        public int? SessionID { get; set; }
        public int? ClassID { get; set; }
        public string? SectionIDs { get; set; }
        public string? SessionName { get; set; }
        public string? ClassName { get; set; }
        public string? SectionNames { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class AlumniEventUpsertRequest
    {
        public int EventID { get; set; }
        public string? EventTitle { get; set; }
        public string? EventDescription { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string? Location { get; set; }
        public byte[]? EventPhoto { get; set; }
        public string? EventPhotoType { get; set; }
        public string? EventPhotoName { get; set; }
        public int EventFor { get; set; }
        public int? SessionID { get; set; }
        public int? ClassID { get; set; }
        public string? SectionIDs { get; set; }
        public int? CompanyId { get; set; }
    }

    public class AlumniEventAddPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public AlumniEventViewModel AlumniEvent { get; set; } = new();
        public AlumniEventViewModel EditAlumniEvent { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstClassViewModel> ClassList { get; set; } = new();
    }

    public class AlumniEventPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<AlumniEventViewModel> AlumniEvent { get; set; } = new();

        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstClassViewModel> ClassList { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public int? ComplaintTypeID { get; set; }
        public int? SourceID { get; set; }
    }

    public class AlumniEventAttachmentUpsertRequest
    {
        public int EventID { get; set; }
        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
    }
}
