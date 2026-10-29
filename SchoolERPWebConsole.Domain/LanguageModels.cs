namespace SchoolERPWebConsole.Domain
{
    /// <summary>
    /// This class represents the data structure and schema for MstLanguageViewModel.
    /// </summary>
    public class MstLanguageViewModel
    {
        public int LanguageId { get; set; }
        public string LanguageTitle { get; set; }
        public string LanguageCode { get; set; }
        public string LanguageIcon { get; set; }
        public bool LanguageIsRtl { get; set; }
        public bool LanguageBase { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    /// <summary>
    /// This class represents the data structure and schema for MstLanguageUpsertRequest.
    /// </summary>
    public class MstLanguageUpsertRequest
    {
        public int LanguageId { get; set; }
        public string LanguageTitle { get; set; }
        public string LanguageCode { get; set; }
        public string LanguageIcon { get; set; }
        public bool LanguageIsRtl { get; set; }
        public bool LanguageBase { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// This class represents the data structure and schema for MstLanguagePageViewModel.
    /// </summary>
    public class MstLanguagePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<MstLanguageViewModel> Languages { get; set; } = new List<MstLanguageViewModel>();
    }

    public class LanguageAddPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public MstLanguageViewModel Languages { get; set; } = new();
        public MstLanguageViewModel EditLanguages { get; set; } = new();
    }

    public class LanguagePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<MstLanguageViewModel> Languages { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }
}
