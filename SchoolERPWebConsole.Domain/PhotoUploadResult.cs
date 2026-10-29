namespace SchoolERPWebConsole.Domain
{
    public class PhotoUploadResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string PhotoUrl { get; set; } = string.Empty; // relative URL e.g. /Staff/Profile/101/101.png
        public string FileName { get; set; } = string.Empty;
    }
}
