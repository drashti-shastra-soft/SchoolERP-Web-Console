using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class ItemStockModel
    {
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        public int ItemStockId { get; set; }

        public int? ItemCategoryId { get; set; }
        public int? ItemId { get; set; }
        public int? ItemStoreId { get; set; }
        public int? ItemSupplierId { get; set; }

        public int? Quantity { get; set; }
        public decimal? PurchasePrice { get; set; }
        public DateTime? PurchaseDate { get; set; }

        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
        public string? Description { get; set; }

        public string? CategoryName { get; set; }
        public string? SupplierName { get; set; }
        public string? ItemName { get; set; }
        public string? ItemStoreName { get; set; }

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

    public class ItemStockModelRequest
    {
        public int ItemStockId { get; set; }

        public int? ItemCategoryId { get; set; }
        public int? ItemId { get; set; }
        public int? ItemStoreId { get; set; }
        public int? ItemSupplierId { get; set; }

        public int? Quantity { get; set; }
        public decimal? PurchasePrice { get; set; }
        public DateTime? PurchaseDate { get; set; }

        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
        public string? Description { get; set; }

        public int? CompanyID { get; set; }
        public int? SessionID { get; set; }

        public bool IsActive { get; set; }
        public int? UserId { get; set; }
        public string? IPAddress { get; set; }
    }

    public class SearchItemStockRequest
    {
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public string? SearchKeyword { get; set; }
        public int? PageNumber { get; set; }
        public int PageSize { get; set; }
        public int? UserId { get; set; }

        public int? ItemCategoryId { get; set; }
        public int? ItemId { get; set; }
    }

    public class ItemStockPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<ItemStockModel> ItemStock { get; set; } = new List<ItemStockModel>();
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public string? CurrencySymbol { get; set; } = string.Empty;
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public int? SectionID { get; set; }
    }

    public class ItemStockAddViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public ItemStockModel? EditItemStock { get; set; } = new ItemStockModel();
        public List<DropdownModel> ItemCategory { get; set; } = new List<DropdownModel>();
        public List<DropdownModel> Item { get; set; } = new List<DropdownModel>();
        public List<DropdownModel> ItemSupplier { get; set; } = new List<DropdownModel>();
        public List<DropdownModel> ItemStore { get; set; } = new List<DropdownModel>();
        public string? CurrencySymbol { get; set; }
    }

    public class UpsertItemStockResponse
    {
        public SpItemStockReceive Result { get; set; }
    }

    public class ItemStockAttachmentUpsertRequest
    {
        public int ItemStockId { get; set; }
        public string? Attachment { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
    }
}
