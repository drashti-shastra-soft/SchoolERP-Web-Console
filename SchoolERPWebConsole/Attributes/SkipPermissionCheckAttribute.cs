namespace SchoolERPWebConsole.Attributes
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
    public class SkipPermissionCheckAttribute : Attribute
    {
    }
}
