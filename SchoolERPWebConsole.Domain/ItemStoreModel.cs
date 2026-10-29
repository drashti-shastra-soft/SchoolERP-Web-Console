using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class ItemStoreModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int ItemStoreId { get; set; }
        public string? ItemStoreName { get; set; }
        public string? DisplayLabel { get; set; }
        public string? Description { get; set; }
        public string? ItemStoreCode { get; set; }

        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }

        public bool IsActive { get; set; }
        public bool IsDelete { get; set; }

        public int CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }

        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class ItemStoreModelRequest
    {
        public int ItemStoreId { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string ItemStoreName { get; set; }
        public string? DisplayLabel { get; set; }
        public string? Description { get; set; }
        public string? ItemStoreCode { get; set; }
        public bool IsActive { get; set; }
        public int? UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class ItemStorePageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ItemStoreModel> ItemStore { get; set; } = new List<ItemStoreModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public int? SectionID { get; set; }
    }

    public class ItemStoreAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public ItemStoreModel? EditItemStore { get; set; } = new ItemStoreModel();
    }
}
