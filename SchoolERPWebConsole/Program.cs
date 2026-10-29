using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using SchoolERPWebClient.Services.Clients;
using SchoolERPWebConsole.Helpers;
using SchoolERPWebConsole.Services;
using SchoolERPWebConsole.Services.Clients;
using System.Text;

var builder = WebApplication.CreateBuilder(args);


// Minimal services for UI only
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

// Single shared API base address (point to SchoolERP.API)
var apiBaseUrl = builder.Configuration["ApiUrl:BaseUrl"];

builder.Services.AddScoped<ILocalizationService, LocalizationService>();
builder.Services.AddScoped<PermissionHelper>();
// Register the filter itself so DI can construct it
builder.Services.AddScoped<PermissionAuthorizationFilter>();

builder.Services.AddControllersWithViews(options =>
{
    options.Filters.AddService<PermissionAuthorizationFilter>();
});

// Add AuthClient
builder.Services.AddHttpClient<IAuthClientService, AuthClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
// Add AuthClient
builder.Services.AddHttpClient<IPhotoUploadService, PhotoUploadService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
// Add UserClient
builder.Services.AddHttpClient<IUserClientService, UserClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IUserMenuPermissionClientService, UserMenuPermissionClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
// Add RoleClient
builder.Services.AddHttpClient<IRoleClientService, RoleClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add UserTypeClient
builder.Services.AddHttpClient<IUserTypeClientService, UserTypeClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add MenuClient
builder.Services.AddHttpClient<IMenuClientService, MenuClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add SettingsClient
builder.Services.AddHttpClient<ISettingsClientService, SettingsClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add UtilityClient
builder.Services.AddHttpClient<IUtilityClientService, UtilityClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add OrganisationClient
builder.Services.AddHttpClient<IOrganisationClientService, OrganisationClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ICompanyClientService, CompanyClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ISessionClientService, SessionClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add CurrencyClient
builder.Services.AddHttpClient<ICurrencyClientService, CurrencyClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

// Add LanguageClient
builder.Services.AddHttpClient<ILanguageClientService, LanguageClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IEmailConfigClientService, EmailConfigClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ISmsConfigClientService, SmsConfigClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IPaymentMethodClientService, PaymentMethodClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ISectionClientService, SectionClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IClassClientService, ClassClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ISubjectClientService, SubjectClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<ISubjectGroupClientService, SubjectGroupClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IFrontOfficeClientService, FrontOfficeClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IHostelClientService, HostelClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IAccountHeadClientService, AccountHeadClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IAccountEntryClientService, AccountEntryClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IPickupPointClientService, PickupPointClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IRouteClientService, RouteClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IVehicleClientService, VehicleClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IVehicleAssignClientService, VehicleAssignClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IRoutePickupPointClientService, RoutePickupPointClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IHumanResourceClientService, HumanResourceClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IHomeworkClientService, HomeworkClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IStudentCertificateClientService, StudentCertificateClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IStudentIDCardClientService, StudentIDCardClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IStudentInformationClientService, StudentInformationClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});


builder.Services.AddHttpClient<IStaffIDCardClientService, StaffIDCardClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IAcademicsClientService, AcademicsClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHttpClient<IStudentLeaveClientService, StudentLeaveClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IAttendanceClientService, AttendanceClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IMenuApiClient, MenuApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IAlumniEventClientService, AlumniEventClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<ILibraryClientService, LibraryClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IFieldClientService, FieldClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IDownloadCenterClientService, DownloadCenterClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IDashboardClientService, DashboardClientService>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<ICopySessionServices, CopySessionServices>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IUserManagementClientService, UserManagementClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IHostelTypeClientService, HostelTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IRoomCoolingTypeClientService, RoomCoolingTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IHolidayTypeClientService, HolidayTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IHolidayClientService, HolidayClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICountryClientService, CountryClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IStateClientService, StateClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IWardensClientService, WardensClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICityClientService, CityClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPostalCodeClienService, PostalCodeClienService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IWeeklyHolidaysSettingClientService, WeeklyHolidaysSettingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryBudgetClientService, LibraryBudgetClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPublisherClientService, PublisherClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IAuthorClientService, AuthorClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryLanguageClientService, LibraryLanguageClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryCategoryClientService, LibraryCategoryClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibrarySubjectClientService, LibrarySubjectClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryCategorySubjectClientService, LibraryCategorySubjectClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryDocumentTypeClientService, LibraryDocumentTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibraryDocumentStatusClientService, LibraryDocumentStatusClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibrarySupplierClientService, LibrarySupplierClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILibrarySeriesClientService, LibrarySeriesClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IDailyAssignmentClientService, DailyAssignmentClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ILessonPlanClientService, LessonPlanClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ITopicClientService, TopicClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IManageLessonPlanClientService, ManageLessonPlanClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IMediaClientService, MediaClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient("SchoolERPApi", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});
builder.Services.AddHttpClient<IBackDateSettingClientService, BackDateSettingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IItemCategoryClientService, ItemCategoryClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IItemStoreClientService, ItemStoreClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IInventoryItemClientService, InventoryItemClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IItemSupplierClientService, ItemSupplierClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IItemStockClientService, ItemStockClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IIssueItemClientService, IssueItemClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IStudentInformationReportClientService, StudentInformationReportClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IAttendanceClientServiceReport, AttendanceClientServiceReport>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICostCenterClientService, CostCenterClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IBudgetHeadClientService, BudgetHeadClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IAccountTypeClientService, AccountTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IVoucherTypeClientService, VoucherTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPaymentTypeClientService, PaymentTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPaymentTypeFieldClientService, PaymentTypeFieldClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPaymentTypeConfigClientService, PaymentTypeConfigClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ISMSTypeClientService, SMSTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ISMSTypeFieldClientService, SMSTypeFieldClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ISMSTypeConfigClientService, SMSTypeConfigClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IVoucherTypeFieldClientService, VoucherTypeFieldClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IVoucherFieldOptionClientService, VoucherFieldOptionClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IVoucherHeaderClientService, VoucherHeaderClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ISubjectTypeClientService, SubjectTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamClientService, ExamClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamGroupClientService, ExamGroupClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamGradeClientService, ExamGradeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamConfigClientService, ExamConfigClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICoScholasticClientService, CoScholasticClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ISubSubjectClientService, SubSubjectClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IClassSubSubjectClientService, ClassSubSubjectClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IRemarkGroupClientService, RemarkGroupClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IRemarkEntryClientService, RemarkEntryClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPaperMarksDetailsClientService, PaperMarksDetailsClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IMarksFeedingClientService, MarksFeedingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICoScholasticMarksFeedingClientService, CoScholasticMarksFeedingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IAttendanceFeedingClientService, AttendanceFeedingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IRemarksFeedingClientService, RemarksFeedingClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IPromotedClassClientService, PromotedClassClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamReportClientService, ExamReportClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICBSESignOffClientService, CBSESignOffClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IStudentReExamClientService, StudentReExamClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IChangeExamClientService, ChangeExamClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IExamMarksheetDownloadPermissionClientService, ExamMarksheetDownloadPermissionClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICategoryGroupClientService, CategoryGroupClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeCategoryClientService, FeeCategoryClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeHeadClientService, FeeHeadClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeTypeClientService, FeeTypeClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeTemplateClientService, FeeTemplateClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeCollectionClientService, FeeCollectionClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});

builder.Services.AddHttpClient<ITeacherDashboardClientService, TeacherDashboardClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
         builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeDiscountClientService, FeeDiscountClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IFeeOpeningBalanceClientService, FeeOpeningBalanceClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});

builder.Services.AddHttpClient<ISMSTemplateClientService, SMSTemplateClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<IEmailTemplateClientService, EmailTemplateClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<INoticeBoardClientService, NoticeBoardClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
builder.Services.AddHttpClient<ICommunicationClientService, CommunicationClientService>(client =>
{
    client.BaseAddress = client.BaseAddress = new Uri(
        builder.Configuration["ApiSettings:BaseUrl"]);
});
// MVC
builder.Services.AddControllersWithViews();

// Global authorization: require authenticated user by default
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// JWT authentication (API issues tokens)
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SchoolERP_Default_Key_1234567890";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // Read token from cookie for MVC page loads (UI stores token client-side)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (string.IsNullOrEmpty(context.Token))
            {
                var path = context.Request.Path;
                if (!path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
                {
                    var cookieToken = context.Request.Cookies["token"];
                    if (!string.IsNullOrEmpty(cookieToken))
                    {
                        context.Token = cookieToken;
                    }
                }
            }
            return Task.CompletedTask;
        },
        OnChallenge = context =>
        {
            var path = context.Request.Path;
            if (!path.StartsWithSegments("/api") && !path.StartsWithSegments("/Auth"))
            {
                context.HandleResponse();
                context.Response.Redirect("/Auth/Login");
            }
            return Task.CompletedTask;
        }
    };
});

var app = builder.Build();

// Pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

// If you still use LocalizationMiddleware in UI keep it; otherwise remove:
// app.UseMiddleware<LocalizationMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Optional: Protect API routes served by this project (if any)
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var isApiRoute = path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
    var isAnonymousApiRoute = path.StartsWithSegments("/api/auth/login", StringComparison.OrdinalIgnoreCase);

    if (isApiRoute && !isAnonymousApiRoute && context.User?.Identity?.IsAuthenticated != true)
    {
        await context.ChallengeAsync(JwtBearerDefaults.AuthenticationScheme);
        return;
    }

    await next();
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}");

app.Run();
