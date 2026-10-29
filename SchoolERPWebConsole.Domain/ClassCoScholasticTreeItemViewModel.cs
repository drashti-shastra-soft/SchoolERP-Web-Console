using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    // One row of the flat tree list returned by USP_ClassCoScholastic_GetList
    public class ClassCoScholasticTreeItemViewModel
    {
        public int CoScholasticID { get; set; }
        public int? ParentID { get; set; }
        public string Title { get; set; } = string.Empty;
        public int? SrNo { get; set; }
        public bool IsGroup { get; set; }
        public int? ClassCoScholasticID { get; set; }
        public bool IsChecked { get; set; }
    }

    // Posted back to /ClassCoScholastic/Save
    public class ClassCoScholasticSaveRequest
    {
        public int ClassID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public List<int> CheckedIds { get; set; } = new();
    }

    public class ClassCoScholasticPageViewModel
    {
        public int ClassID { get; set; }
        public int CompanyID { get; set; }
        public int SessionID { get; set; }
        public List<MstClassViewModel> Classes { get; set; } = new();
        public List<ClassCoScholasticTreeItemViewModel> Tree { get; set; } = new();
        public PagePermissions Permissions { get; set; } = new();
    }
}
