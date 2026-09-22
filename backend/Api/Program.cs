using System.Text;
using System.Text.Json.Serialization;
using System.Security.Claims;
using AccesUrbanMap.Api.Features.Auth;
using AccesUrbanMap.Api.Logging;
using AccesUrbanMap.Api.Services;
using AccesUrbanMap.Application.Services.Routes;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;

const string logOutputTemplate = "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {Message:lj}{NewLine}{Exception}";

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: logOutputTemplate)
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddUserSecrets<Program>(optional: true);
var logDirectory = Path.Combine(builder.Environment.ContentRootPath, "logs");
Directory.CreateDirectory(logDirectory);
var logFilePath = Path.Combine(logDirectory, "accesurbanmap-.log");

builder.Host.UseSerilog((_, _, loggerConfiguration) => loggerConfiguration
    .MinimumLevel.Error()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Error)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Fatal)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "AccesUrbanMap.Api")
    .Enrich.WithProperty("Environment", builder.Environment.EnvironmentName)
    .WriteTo.Console(outputTemplate: logOutputTemplate)
    .WriteTo.File(
        logFilePath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        fileSizeLimitBytes: 10_000_000,
        rollOnFileSizeLimit: true,
        shared: true,
        outputTemplate: logOutputTemplate));

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection nu este configurat.");
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt nu este configurat.");

if (Encoding.UTF8.GetByteCount(jwtOptions.Key) < 32)
    throw new InvalidOperationException("Jwt:Key trebuie să conțină cel puțin 32 de caractere.");

builder.Services.AddDbContext<AccesUrbanMapDbContext>(
    options => options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()),
    contextLifetime: ServiceLifetime.Scoped);
builder.Services.AddScoped<RouteService>();
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdText = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdText, out var userId))
                {
                    context.Fail("Tokenul nu contine un utilizator valid.");
                    return;
                }

                var database = context.HttpContext.RequestServices.GetRequiredService<AccesUrbanMapDbContext>();
                var account = await database.Users.AsNoTracking()
                    .Where(user => user.Id == userId)
                    .Select(user => new { user.Name, user.Email, user.Role })
                    .FirstOrDefaultAsync(context.HttpContext.RequestAborted);
                if (account is null)
                {
                    context.Fail("Contul nu mai exista.");
                    return;
                }

                if (context.Principal?.Identity is not ClaimsIdentity identity)
                {
                    context.Fail("Tokenul nu are o identitate valida.");
                    return;
                }

                ReplaceIdentityClaim(identity, ClaimTypes.Name, account.Name);
                ReplaceIdentityClaim(identity, ClaimTypes.Email, account.Email);
                ReplaceIdentityClaim(identity, ClaimTypes.Role, account.Role.ToString());
            }
        };
    });
builder.Services.AddAuthorization();
var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    try
    {
        var database = scope.ServiceProvider.GetRequiredService<AccesUrbanMapDbContext>();
        await database.Database.MigrateAsync();
        await PlaceDataSeeder.SeedAsync(database);
    }
    catch (Exception exception)
    {
        Log.Fatal(exception, "Migrarea bazei de date nu a putut fi aplicata la pornirea API-ului.");
        throw;
    }
}

app.UseCors();
app.UseStaticFiles();
app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} returned {StatusCode} | TraceId: {TraceId}";
    options.GetLevel = (httpContext, _, exception) =>
        exception is not null || httpContext.Response.StatusCode >= StatusCodes.Status400BadRequest
            ? LogEventLevel.Error
            : LogEventLevel.Debug;
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
    };
});
app.UseMiddleware<ExceptionLoggingMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Lifetime.ApplicationStopped.Register(Log.CloseAndFlush);
app.Run();

static void ReplaceIdentityClaim(ClaimsIdentity identity, string claimType, string value)
{
    foreach (var claim in identity.FindAll(claimType).ToList())
        identity.RemoveClaim(claim);

    identity.AddClaim(new Claim(claimType, value));
}
