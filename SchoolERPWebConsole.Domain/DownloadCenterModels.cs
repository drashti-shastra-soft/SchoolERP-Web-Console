namespace SchoolERPWebConsole.Domain
{
    public class ContentTypeViewModel
    {
        public int ContentTypeID { get; set; }
        public int CompanyID { get; set; }
        public string? TypeName { get; set; }
        public string? Description { get; set; }
        public string? DisplayLabel { get; set; }
        public bool IsActive { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }
    public class ContentTypePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ContentTypeViewModel> ContentType { get; set; } = new List<ContentTypeViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyID { get; set; }
    }
    public class ContentTypeAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public ContentTypeViewModel EditItems { get; set; } = new();
    }

    public class ContentTypeUpsertRequest
    {
        public int ContentTypeID { get; set; }
        public int CompanyID { get; set; }
        public string? TypeName { get; set; }
        public string? Description { get; set; }
        public string? DisplayLabel { get; set; }
    }

    public class VideoTutorialViewModel
    {
        public int VideoID { get; set; }
        public string? Title { get; set; }
        public string? VideoLink { get; set; }
        public string? Description { get; set; }
        public int? ClassID { get; set; }
        public int? SectionID { get; set; }
        public string? ClassName { get; set; }
        public string? SectionName { get; set; }
        public DateTime CreatedOn { get; set; }
        public string? SharedBy { get; set; }
        public bool IsActive { get; set; }

        public int? CompanyId { get; set; }

    }

    public class VideoTutorialPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<VideoTutorialViewModel> VideoTutorial { get; set; } = new List<VideoTutorialViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstClassViewModel> Classes { get; set; } = new List<MstClassViewModel>();
        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyID { get; set; }
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE

        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class AddVideoTutorialViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public VideoTutorialViewModel EditItems { get; set; } = new();
        public List<MstClassViewModel> Classes { get; set; } = new List<MstClassViewModel>();
    }

    public class VideoTutorialUpsertRequest
    {
        public int VideoID { get; set; }
        public string? Title { get; set; }
        public string? VideoLink { get; set; }
        public string? Description { get; set; }
        public int? ClassID { get; set; }
        public int? SectionID { get; set; }
        public int? CompanyID { get; set; }
    }

    public class ContentViewModel
    {
        public int ContentID { get; set; }
        public string? Title { get; set; }
        public string? ContentTypeName { get; set; }
        public string? FileType { get; set; }
        public string? FileName { get; set; }
        public string? FilePath { get; set; }
        public string? FileSize { get; set; }
        public string? UploadBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public bool IsActive { get; set; }
    }

    public class ContentUploadRequest
    {
        public string? Title { get; set; }
        public int ContentTypeID { get; set; }
        public string? VideoLink { get; set; } // For YouTube
        // File is handled via IFormFile in controller
    }

    public class SharedLinkUpsertRequest
    {
        public string? Title { get; set; }
        public DateTime? ShareDate { get; set; }
        public DateTime? ValidUpto { get; set; }
        public List<int>? ContentIDs { get; set; }
        public int? CompanyID { get; set; }
        public string? SendToType { get; set; }
    }

    public class SharedLinkViewModel
    {
        public int SharedLinkID { get; set; }
        public int? CompanyID { get; set; }
        public string? Title { get; set; }
        public Guid ShareToken { get; set; }
        public DateTime? ShareDate { get; set; }
        public DateTime? ValidUpto { get; set; }
        public DateTime CreatedOn { get; set; }
        public string? SharedBy { get; set; }
    }
    public class SharedLinkPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ContentViewModel> Items { get; set; } = new List<ContentViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<ContentTypeViewModel> ContentType { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyID { get; set; }
    }
    public class AddSharedLinkViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public SharedLinkViewModel EditItems { get; set; } = new();
        public List<ContentTypeViewModel> ContentType { get; set; } = new();
        public List<RoleViewModel> RoleList { get; set; } = new();
        public List<MstClassViewModel> Classes { get; set; } = new List<MstClassViewModel>();
    }

    public class SharedLinkViewPageModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<SharedLinkViewModel> Items { get; set; } = new List<SharedLinkViewModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyID { get; set; }
    }
}
