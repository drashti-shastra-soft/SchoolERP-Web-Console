using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class InventoryItemModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE

        public int ItemId { get; set; }
        public int ItemCategoryId { get; set; }
        public string? ItemName { get; set; }
        public string? Unit { get; set; }
        public string? Description { get; set; }
        public string? ItemCategoryName { get; set; }

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
    public class InventoryItemModelRequest
    {
        public int ItemId { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public int ItemCategoryId { get; set; }
        public string? ItemName { get; set; }
        public string? Unit { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int? UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class InventoryItemPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<InventoryItemModel> Item { get; set; } = new List<InventoryItemModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public int? SectionID { get; set; }
        public int? ItemCategoryId { get; set; }
    }

    public class InventoryItemAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public InventoryItemModel? EditItem { get; set; } = new InventoryItemModel();
        public List<DropdownModel> ItemCategory { get; set; } = new List<DropdownModel>();
    }

    public class SearchInventoryItemRequest
    {
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string? SearchKeyword { get; set; }
        public int? PageNumber { get; set; }
        public int PageSize { get; set; }
        public int? UserId { get; set; }
        public int? ItemCategoryId { get; set; }
    }
}
