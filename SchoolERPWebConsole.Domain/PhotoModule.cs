namespace SchoolERPWebConsole.Domain
{
    public enum PhotoModule
    {
        Staff,      // → wwwroot/Staff/Profile/{id}/
        Student,    // → wwwroot/Student/Profile/{id}/
        Employee,   // → wwwroot/Employee/Profile/{id}/
        User,        // → wwwroot/User/Profile/{id}/
        Parent,    // → wwwroot/Student/Profile/{id}/
        Warden,
        Complaint,
        VisitorBook,
        PostalDispatch,
        PostalReceive,
        LeaveApp,
        BookCoverPage,
        Homework,
        Media,
        LessonPlan,
        Document,
        Account,
        Event,
        PaymentType,
        SMSType,
        Company,
        EmailTemplate,
        NoticeBoard
    }

    public enum FolderNameModule 
    {
        Profile,
        Documents,
        Account,
        Video,
        Images,
        Logo
    }
}
