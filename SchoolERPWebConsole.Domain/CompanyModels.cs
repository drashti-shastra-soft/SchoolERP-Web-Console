namespace SchoolERPWebConsole.Domain
{
    public class MstCompanyViewModel
    {
        public int CompanyId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string SchoolCode { get; set; }
        public int? ParentCompanyId { get; set; }
        public string? ParentName { get; set; }
        public string? Address { get; set; }
        public string? HeadOfficeAddress { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public bool FeePayAllowOnPortal { get; set; }
        public bool Close { get; set; }
        public bool LeaveFinalApprovedByHODOnPortal { get; set; }
        public bool FeeReceiptSearchAllStudents { get; set; }
        public bool Scholarship { get; set; }
        public bool FeeTemplate { get; set; }
        public bool StudentAttedanceOnline { get; set; }
        public bool IsGroup { get; set; }
        public bool PortalFeePay { get; set; }
        public bool LeaveDefaultApprovedOnPortal { get; set; }
        public bool IsUniversity { get; set; }
        public bool FeeTemplate2 { get; set; }
        public bool CourseSemesterTemplate { get; set; }
        public bool LoginWithOTP { get; set; }
        public bool SubtituteLeaveApprovedOnPortal { get; set; }
        public bool HostelFeeWithTemplate { get; set; }
        public bool MarkFeedingWithCopyNo { get; set; }
        public bool AllowSession { get; set; }
        public int SessionId { get; set; }
        public string? SessionTitle { get; set; }
        public string? AdmissionNo { get; set; }
        public string? BoardName { get; set; }
        public string? SchoolStatus { get; set; }
        public string? LateFinePerDay { get; set; }
        public string? LibraryFinePerDay { get; set; }
        public string? LateFineMaxPerBook { get; set; }
        public int CurrencyId { get; set; }
        public string? CurrencyCode { get; set; }
        public string? SessionStartMonth { get; set; }
        public string? DateFormat { get; set; }
        public string? Timezone { get; set; }
        public string? StartDayOfWeek { get; set; }
        public string? CurrencyFormat { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }
        public int Level { get; set; }
        public bool HasChildren { get; set; }
        public string? PostalCode { get; set; }
        public int? CountryId { get; set; }
        public int? StateId { get; set; }
        public int? CityId { get; set; }

        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
        
        //public string? PrintLogoUrl { get; set; }
        //public string? AdminLogoUrl { get; set; }
        //public string? AdminSmallLogoUrl { get; set; }
        //public string? WaterMarkUrl { get; set; }
        //public string? LoginBackgroundUrl { get; set; }

        public string? PrintLogo { get; set; }
        public string? AdminLogo { get; set; }
        public string? AdminSmallLogo { get; set; }
        public string? WaterMarkLogo { get; set; }
        public string? BackgroundLogo { get; set; }

        public string? PrintLogoName { get; set; }
        public string? AdminLogoName { get; set; }
        public string? AdminSmallLogoName { get; set; }
        public string? WaterMarkLogoName { get; set; }
    }

    public class MstCompanyUpsertRequest
    {
        public int CompanyId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string SchoolCode { get; set; }
        public int? ParentCompanyId { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public int SessionId { get; set; }
        public int CurrencyId { get; set; }
        public string? SessionStartMonth { get; set; }
        public string? DateFormat { get; set; }
        public string? Timezone { get; set; }
        public string? StartDayOfWeek { get; set; }
        public string? CurrencyFormat { get; set; }
        public bool IsActive { get; set; }
        public string? PostalCode { get; set; }
        public int? CountryId { get; set; }
        public int? StateId { get; set; }
        public int? CityId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? BoardName { get; set; }
        public string? SchoolStatus { get; set; }
        public string? LateFinePerDay { get; set; }
        public string? LibraryFinePerDay { get; set; }
        public string? LateFineMaxPerBook { get; set; }
        public string? PrintLogoUrl { get; set; }


        public string? PrintLogoBase64 { get; set; }
        public string? PrintLogoName { get; set; }

        public string? AdminLogoBase64 { get; set; }
        public string? AdminLogoName { get; set; }

        public string? AdminSmallLogoBase64 { get; set; }
        public string? AdminSmallLogoName { get; set; }

        public string? WaterMarkBase64 { get; set; }
        public string? WaterMarkName { get; set; }

        public string? LoginBackgroundBase64 { get; set; }
        public string? LoginBackgroundName { get; set; }
    }

    public class MstCompanyPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstCompanyViewModel> ParentCompanies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstCurrencyViewModel> Currencies { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }
    public class CompaniesAddPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstCompanyViewModel> ParentCompanies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public List<MstCurrencyViewModel> Currencies { get; set; } = new();
        public MstCompanyViewModel EditCompanies { get; set; } = new();

        public List<CountryModel> Country { get; set; } = new();
        public List<StateModel> State { get; set; } = new();
        public List<CityModel> City { get; set; } = new();
    }
    public class SetCurrentCompanyRequest
    {
        public int CompanyId { get; set; }
    }

    public class ReqAttendanceCountModel
    {
        public int CompanyId { get; set; }
        public int SessionId { get; set; }
        public int AttendanceStatus { get; set; }
        public DateTime AttendanceDate { get; set; }
        public int? UserId { get; set; }
    }

    public class AttendanceCountModel
    {
        public int Result { get; set; }
        public string Message { get; set; }
        public int TotalStudents { get; set; }
        public int PresentStudents { get; set; }
        public int AbsentStudents { get; set; }
    }

    public class UserRoleWiseCountModel
    {
        public int Result { get; set; }
        public string Message { get; set; }
        public int RoleID { get; set; }
        public string RoleName { get; set; }
        public int UserCount { get; set; }
    }

    public class CurrentCompanyResult
    {
        public int Result { get; set; }
        public string Message { get; set; }
        public int? CompanyId { get; set; }
    }

    public class CompanyLogoSaveModel
    {
        public int CompanyID { get; set; }
        public int? UserID { get; set; }

        public string? PrintLogo { get; set; }
        public string? PrintLogoType { get; set; }
        public string? PrintLogoName { get; set; }

        public string? AdminLogo { get; set; }
        public string? AdminLogoType { get; set; }
        public string? AdminLogoName { get; set; }

        public string? AdminSmallLogo { get; set; }
        public string? AdminSmallLogoType { get; set; }
        public string? AdminSmallLogoName { get; set; }

        public string? WaterMarkLogo { get; set; }
        public string? WaterMarkLogoType { get; set; }
        public string? WaterMarkLogoName { get; set; }

        public string? BackgroundLogo { get; set; }
        public string? BackgroundLogoType { get; set; }
        public string? BackgroundLogoName { get; set; }
    }

    public class CompanyLogoRequest
    {
        public int CompanyID { get; set; }

        public int? UserID { get; set; }

        public string? PrintLogo { get; set; }
        public string? PrintLogoType { get; set; }
        public string? PrintLogoName { get; set; }

        public string? AdminLogo { get; set; }
        public string? AdminLogoType { get; set; }
        public string? AdminLogoName { get; set; }

        public string? AdminSmallLogo { get; set; }
        public string? AdminSmallLogoType { get; set; }
        public string? AdminSmallLogoName { get; set; }

        public string? WaterMarkLogo { get; set; }
        public string? WaterMarkLogoType { get; set; }
        public string? WaterMarkLogoName { get; set; }

        public string? BackgroundLogo { get; set; }
        public string? BackgroundLogoType { get; set; }
        public string? BackgroundLogoName { get; set; }
    }

    public class CompanyLogoResponse
    {
        public int CompanyLogoID { get; set; }

        public int CompanyID { get; set; }

        public string? PrintLogoUrl { get; set; }

        public string? AdminLogoUrl { get; set; }

        public string? AdminSmallLogoUrl { get; set; }

        public string? WaterMarkUrl { get; set; }

        public string? LoginBackgroundUrl { get; set; }
    }


    public class StaffAttendanceCountViewModel
    {
        public int PresentStaff { get; set; }
        public int TotalStaff { get; set; }
    }
}
