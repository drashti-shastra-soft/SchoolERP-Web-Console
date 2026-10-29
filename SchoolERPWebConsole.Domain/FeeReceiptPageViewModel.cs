using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class FeeReceiptPageViewModel
    {
        public PagePermissions Permissions { get; set; } = PagePermissions.Denied;
        public DateTime TodayDate { get; set; }
    }
}
