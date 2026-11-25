using System.Text.Json.Serialization;
using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Infrastructure;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Web.Middlewares;

var builder = WebApplication.CreateBuilder(args);

// Add infrastructure and domain services
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add controllers with Enum string serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// CORS for development support
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Migrate and initialize SQLite database + seed admin user
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var datasetManager = scope.ServiceProvider.GetRequiredService<IDatasetManager>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    await DbInitializer.InitializeAsync(context, authService, datasetManager, logger);
}

// Global exception handling
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// Serve built React SPA static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapFallbackToFile("index.html");

app.Run();
