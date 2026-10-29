namespace SchoolERPWebConsole.Domain
{
    public class AccountEntryViewModel
    {
        public int AccountEntryID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int AccountHeadID { get; set; }
        public string? HeadName { get; set; }
        public string EntryType { get; set; } = string.Empty; // 'Income' / 'Expense'
        public string Name { get; set; } = string.Empty;
        public string? InvoiceNo { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string? AttachDoc { get; set; }
        public string? AttachDocType { get; set; }
        public string? AttachDocName { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
    }

    public class AccountEntryUpsertRequest
    {
        public int AccountEntryID { get; set; }
        public int AccountHeadID { get; set; }
        public string EntryType { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? InvoiceNo { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string? AttachDoc { get; set; }
        public string? AttachDocType { get; set; }
        public string? AttachDocName { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string? ExistingFileName { get; set; }   // added
        public bool RemoveAttachment { get; set; }       // added
    }

    public class AccountEntryPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<AccountEntryViewModel> Items { get; set; } = new();
        public List<AccountHeadViewModel> Heads { get; set; } = new();
        public string EntryType { get; set; } = string.Empty;

        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
    }

    public class AccountEntryFormModel
    {
        public int AccountEntryID { get; set; }
        public int AccountHeadID { get; set; }
        public string EntryType { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? InvoiceNo { get; set; }
        public DateTime Date { get; set; } = DateTime.Today;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        //public IFormFile? Attachment { get; set; }
        public string? Attachment { get; set; }
    }

    public class AccountEntryAddViewModel
    {
        public AccountEntryViewModel Entry { get; set; } = new();
        public List<AccountHeadViewModel> Heads { get; set; } = new();
        public string EntryType { get; set; } = string.Empty;
    }

    public class AccountEntrySearchRequest
    {
        public int CompanyId { get; set; }
        public int SessionId { get; set; }
        public string EntryType { get; set; }          // e.g. "Expense", "Income"
        public string? SearchKeyword { get; set; }          // e.g. "Expense", "Income"
        public string? SearchType { get; set; }        // optional
        public DateTime? DateFrom { get; set; }        // optional
        public DateTime? DateTo { get; set; }          // optional
        public int PageIndex { get; set; } = 1;        // 1-based page number
        public int PageSize { get; set; } = 10;
    }
    public class AccountEntrySearchViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<AccountEntryViewModel> Results { get; set; } = new();
        public string HeadType { get; set; } = string.Empty; // To distinguish between Income/Expense in UI
        public List<AccountHeadViewModel> Heads { get; set; } = new();

        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchKeyword { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public string SearchType { get; set; } = string.Empty;
        public string EntryType { get; set; } = string.Empty;
        public string? DateFrom { get; set; }
        public string? DateTo { get; set; }
        public decimal TotalAmount => Results.Sum(x => x.Amount);
    }
    //public class AccountEntrySearchViewModel
    //{
    //    public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
    //    public List<AccountEntryViewModel> Results { get; set; } = new();
    //    public string EntryType { get; set; } = string.Empty;
    //    public string SearchType { get; set; } = string.Empty;
    //    public string? DateFrom { get; set; }
    //    public string? DateTo { get; set; }
    //    public decimal TotalAmount => Results.Sum(x => x.Amount);
    //}

    public class AccountEntryAddPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public AccountEntryViewModel EditItems { get; set; } = new();
        public string HeadType { get; set; } = string.Empty; // To distinguish between Income/Expense in UI
        public List<AccountHeadViewModel> Heads { get; set; } = new();
    }
    public class UpsertExpenseResponse
    {
        public SpExpense Result { get; set; }
    }

    public class AccountEntryAttachmentUpsertRequest
    {
        public int AccountEntryID { get; set; }
        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
    }
}
