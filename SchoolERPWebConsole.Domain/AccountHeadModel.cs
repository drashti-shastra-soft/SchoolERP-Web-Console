using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class AccountHeadModel
    {
        public int AccountID { get; set; }

        public string? AccountName { get; set; }
        public int? AccountTypeID { get; set; }
        public int? ParentAccountID { get; set; }
        public string? AccountNo { get; set; }
        public int? CostCenterID { get; set; }

        public string? PostalCode { get; set; }
        public int? CountryId { get; set; }
        public int? StateId { get; set; }
        public int? CityId { get; set; }
        public int? AreaID { get; set; }

        public string? Email { get; set; }
        public string? RepresentedBy { get; set; }
        public string? PayeeName { get; set; }
        public string? Address { get; set; }

        public string? PhoneOff { get; set; }
        public string? PhoneRes { get; set; }
        public string? MobileNo { get; set; }
        public string? Fax { get; set; }

        public int? CreditDays { get; set; }
        public decimal? CreditLimit { get; set; }
        public decimal? OpeningBalance { get; set; }

        public string? OpeningBalType { get; set; }
        public DateTime? OpeningDate { get; set; }

        public string? TinNo { get; set; }
        public string? PANNo { get; set; }
        public string? STTNo { get; set; }
        public string? ServiceTaxNo { get; set; }
        public string? CSTNo { get; set; }
        public string? ECCNo { get; set; }
        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }
        public bool? IsBlocked { get; set; }

        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }

        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }
        public int? ModifiedBy { get; set; }

        public string AccountTypeName { get; set; }
        public string CostCenter { get; set; }

        public string? AttachDoc { get; set; }
        public string? AttachDocType { get; set; }
        public string? AttachDocName { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class AccountRequest
    {
        public int? AccountID { get; set; }

        public string? AccountName { get; set; }
        public int? AccountTypeID { get; set; }
        public int? ParentAccountID { get; set; }
        public string? AccountNo { get; set; }
        public int? CostCenterID { get; set; }

        public string? PostalCode { get; set; }
        public int? CountryId { get; set; }
        public int? StateId { get; set; }
        public int? CityId { get; set; }
        public int? AreaID { get; set; }

        public string? Email { get; set; }
        public string? RepresentedBy { get; set; }
        public string? PayeeName { get; set; }
        public string? Address { get; set; }

        public string? PhoneOff { get; set; }
        public string? PhoneRes { get; set; }
        public string? MobileNo { get; set; }
        public string? Fax { get; set; }

        public int? CreditDays { get; set; }
        public decimal? CreditLimit { get; set; }
        public decimal? OpeningBalance { get; set; }

        public string? OpeningBalType { get; set; }
        public DateTime? OpeningDate { get; set; }

        public string? TinNo { get; set; }
        public string? PANNo { get; set; }
        public string? STTNo { get; set; }
        public string? ServiceTaxNo { get; set; }
        public string? CSTNo { get; set; }
        public string? ECCNo { get; set; }

        public bool? IsBlocked { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }

        public string? AttachDoc { get; set; }
        public string? AttachDocType { get; set; }
        public string? AttachDocName { get; set; }
        public string? ExistingFileName { get; set; }   // added
        public bool RemoveAttachment { get; set; }       // added

        public int CreatedBy { get; set; }
        public int? ModifiedBy { get; set; }

        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }
        public int? UserID { get; set; }
        public string? UserName { get; set; }
        public string? IPAddress { get; set; }
    }
    public class AccountPageViewModel 
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<AccountHeadModel> AccountHead { get; set; } = new();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public int TotalRecords { get; set; }
        public int? PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
    }
    public class AddAccountHeadPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public AccountHeadModel EditAccountHead { get; set; } = new();
        public string HeadType { get; set; } = string.Empty; // To distinguish between Income/Expense in UI
        public List<AccountTypeModel> AccountTypeList { get; set; } = new();
        public List<DropdownModel> ParentAccountList { get; set; } = new();
        public List<CostCenterModel> CostCenterList { get; set; } = new();
        public List<DropdownModel> AreaList { get; set; } = new();
        public List<CountryModel> Country { get; set; } = new();
    }

    public class SearchAccountHeadRequest
    {
        public int CompanyID { get; set; }
        public int SessionID { get; set; }

        public string? SearchKeyword { get; set; }
        public int? PageNumber { get; set; }
        public int PageSize { get; set; }
        public int? CostCenterID { get; set; }
        public string? OpeningBalType { get; set; }
        public int? UserId { get; set; }
    }
    public class UpsertAccountResponse
    {
        public SpAccount Result { get; set; }
    }
}
