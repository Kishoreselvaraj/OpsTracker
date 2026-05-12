using Aetram_OPs_Track;
using Aetram_OPs_Track.DAL;
using Aetram_OPs_Track.DBO.Repository;
using Aetram_OPs_Track.Security;
using Aetram_OPs_Track.Services.Authentication;
using Aetram_OPs_Track.Services.Registration;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// SQL / configuration
builder.Services.Configure<DatabaseOptions>(
    builder.Configuration.GetSection(DatabaseOptions.SectionName));
builder.Services.Configure<DataAccessOptions>(
    builder.Configuration.GetSection(DataAccessOptions.SectionName));
builder.Services.Configure<AuthenticationOptions>(
    builder.Configuration.GetSection(AuthenticationOptions.SectionName));

// DAL — ADO.NET data access (same pattern as shared DB wrapper projects)
builder.Services.AddScoped<IDBClass, DBClass>();

// DBO layer
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Authentication (centralized)
builder.Services.AddScoped<IPasswordVerifier, Pbkdf2PasswordVerifier>();
builder.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();

// MVC + session (cookie session for MVC + optional auth context)
builder.Services.AddControllersWithViews();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Aetram Ops Tracker API",
        Version = "v1",
        Description = "Session-based auth and APIs under /api/v1. Use POST /api/v1/Auth/login (JSON) from Swagger."
    });
});
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.Name = ".AetramOps.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});

// HTTP context for utilities (e.g. CommonLogs)
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Aetram Ops Tracker v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseSession();
app.UseAuthorization();

app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();
