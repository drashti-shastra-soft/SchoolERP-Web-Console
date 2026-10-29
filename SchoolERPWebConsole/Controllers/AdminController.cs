using Microsoft.AspNetCore.Mvc;

namespace SchoolERPWebConsole.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
