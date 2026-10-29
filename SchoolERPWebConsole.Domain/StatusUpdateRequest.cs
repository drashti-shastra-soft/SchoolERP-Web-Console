namespace SchoolERPWebConsole.Domain
{
    /// <summary>
    /// Generic base request for any toggle-status operation.
    /// Inherit this and set the Ids property with the correct primary key values.
    /// </summary>
    public class StatusUpdateRequest
    {
        /// <summary>
        /// Comma-separated primary key IDs — e.g. "1,5,7"
        /// Works for any table: UserId, SectionId, ClassId, etc.
        /// </summary>
        public string Ids { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public int DoneBy { get; set; }

        public string? IpAddress { get; set; }
    }

    public class StatusChangePassRequest
    {
        public int StudentID { get; set; }
        public string Password { get; set; }
        public int? UserID { get; set; }
    }

    public class PhoneCallLogChartModel
    {
        public int Result { get; set; }
        public string Message { get; set; }
        public int MonthNumber { get; set; }
        public string MonthName { get; set; }
        public int Completed { get; set; }
        public int Ongoing { get; set; }
        public int Rescheduled { get; set; }
    }

    public class PhoneCallLogChartResponse
    {
        public string[] Months { get; set; }
        public int[] Completed { get; set; }
        public int[] Ongoing { get; set; }
        public int[] Rescheduled { get; set; }
    }
}
