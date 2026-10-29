using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class CompanySessionFilterViewModel
    {
        public List<MstCompanyViewModel> Companies { get; set; } = new();
        public List<MstSessionViewModel> Sessions { get; set; } = new();
        public int? CompanyId { get; set; }
        public int? SessionId { get; set; }
        public string CompanyDdlId { get; set; } = "ddlFilterCompany";
        public string SessionDdlId { get; set; } = "ddlFilterSessions";
    }
}
