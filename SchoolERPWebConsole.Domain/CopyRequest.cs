namespace SchoolERPWebConsole.Domain
{
    public class CopyRequest
    {
        public int FromCompanyId { get; set; }
        public int FromSessionId { get; set; }
        public int ToCompanyId { get; set; }
        public int ToSessionId { get; set; }
        public int UserID { get; set; }

    }
    public class CopyForCompanyRequest
    {
        public int FromCompanyId { get; set; }
        public int ToCompanyId { get; set; }
        public int UserID { get; set; }
        public string? IPAddress { get; set; }

    }
}
