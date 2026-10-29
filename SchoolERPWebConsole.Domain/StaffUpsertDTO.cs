namespace SchoolERPWebConsole.Domain
{
    public class StaffUpsertDTO
    {
        public int Result { get; set; }
        public string Message { get; set; } = string.Empty;
        public int StaffID { get; set; }
    }
}
