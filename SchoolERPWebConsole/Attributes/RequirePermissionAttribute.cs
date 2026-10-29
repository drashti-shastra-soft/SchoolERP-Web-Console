namespace SchoolERPWebConsole.Attributes
{
    [AttributeUsage(AttributeTargets.Method)]
    public class RequirePermissionAttribute : Attribute
    {
        public string PermissionName { get; }
        public RequirePermissionAttribute(string permissionName) => PermissionName = permissionName;
    }
}
