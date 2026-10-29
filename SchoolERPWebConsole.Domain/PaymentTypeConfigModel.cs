using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class PaymentTypeConfigModel
    {
        public int ConfigID { get; set; }

        public int CompanyID { get; set; }

        public int PaymentTypeId { get; set; }

        public int? FieldId { get; set; }

        public string? FieldValue { get; set; }

        public bool IsActive { get; set; }

        public bool IsDelete { get; set; }

        public DateTime CreatedOn { get; set; }

        public int CreatedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int? ModifiedBy { get; set; }
        public int Result { get; set; }       // maps to RESULT
        public string Message { get; set; }   // maps to MESSAGE
        // Must exist — mapped from TOTALCOUNT column in SP
        public int TOTALRECORDS { get; set; }   // ← TOTALCOUNT
        public int CURRENTPAGE { get; set; }   // ← PAGEINDEX
        public int PageSize { get; set; }   // ← PAGESIZE
        public int TotalPages { get; set; }   // ← TOTALPAGES
    }

    public class PaymentTypeConfigRequest
    {
        public int CompanyID { get; set; }

        public int PaymentTypeId { get; set; }

        public List<PaymentTypeConfigFieldRequest> Fields { get; set; }
            = new List<PaymentTypeConfigFieldRequest>();

        public int UserId { get; set; }

        public string? UserName { get; set; }

        public string? IPAddress { get; set; }
    }

    public class PaymentTypeConfigFieldRequest
    {
        public int? FieldId { get; set; }

        public string? FieldValue { get; set; }
    }

    public class PaymentTypeConfigPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public List<PaymentTypeConfigModel> PaymentType { get; set; } = new List<PaymentTypeConfigModel>();

        public int TotalRecords { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
    }


    public class PaymentTypeConfigAddViewModel
    {
        public List<PaymentTypeModel> PaymentType { get; set; } = new();
        public int ActivePaymentTypeId { get; set; }   // currently selected default gateway ("None" if 0)
        public PagePermissions Permissions { get; set; }
        public PaymentTypeFieldAddViewModel EditPaymentType { get; set; } // existing
    }

    

    public class SaveBatchRequest
    {
        public int PaymentTypeId { get; set; }
        public int? CompanyId { get; set; }
        public List<ConfigFieldItem> Fields { get; set; } = new();
    }
    public class ConfigFieldItem 
    {
        public int FieldID { get; set; } 
        public string FieldValue { get; set; } = ""; 
    }
    public class FieldConfigResponse
    {
        public int Result { get; set; }
        public int FieldID { get; set; }
        public string? FieldLabel { get; set; }
        public string? FieldKey { get; set; }
        public string? FieldType { get; set; }
        public bool IsRequired { get; set; }
        public bool IsSecret { get; set; }
        public int DisplayOrder { get; set; }
        public int? ConfigID { get; set; }
        public string? FieldValue { get; set; }
        public bool IsActive { get; set; }
    }
}
