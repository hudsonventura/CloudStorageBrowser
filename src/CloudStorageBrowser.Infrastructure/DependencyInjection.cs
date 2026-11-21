using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Infrastructure.Media;
using CloudStorageBrowser.Infrastructure.Persistence;
using CloudStorageBrowser.Infrastructure.Security;
using CloudStorageBrowser.Infrastructure.Services;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CloudStorageBrowser.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // SQLite configuration path
        var rawConfigDir = configuration["CONFIG_DIR"] ?? "config";
        string configDir;
        if (Path.IsPathRooted(rawConfigDir))
        {
            configDir = rawConfigDir;
        }
        else
        {
            var parentPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", rawConfigDir));
            configDir = Directory.Exists(parentPath) ? parentPath : Path.GetFullPath(rawConfigDir);
        }

        if (!Directory.Exists(configDir))
        {
            Directory.CreateDirectory(configDir);
        }

        var dbPath = Path.Combine(configDir, "cloudstorage.db");
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite($"Data Source={dbPath}"));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        // Security & Auth
        services.AddSingleton<JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();

        // Storage & ZFS
        services.AddScoped<ISnapshotService, ZfsSnapshotService>();
        services.AddScoped<IStorageService, PhysicalStorageService>();
        services.AddScoped<IDatasetManager, DatasetManager>();

        // Media & Metadata
        services.AddScoped<IThumbnailService, ThumbnailService>();
        services.AddScoped<IMetadataExtractorService, MetadataExtractorService>();

        // Authentication & JWT setup
        var jwtService = new JwtTokenService(configuration);
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = jwtService.GetValidationParameters();
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    // 1. If Authorization header is already provided with a Bearer token, let standard handler process it
                    string? authHeader = context.Request.Headers.Authorization;
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        return Task.CompletedTask;
                    }

                    // 2. Read token from query string parameter (?token=...)
                    var queryToken = context.Request.Query["token"].ToString();
                    if (!string.IsNullOrEmpty(queryToken))
                    {
                        context.Token = queryToken;
                        return Task.CompletedTask;
                    }

                    // 3. Read token from cookie (csb_token)
                    if (context.Request.Cookies.TryGetValue("csb_token", out var cookieToken) &&
                        !string.IsNullOrEmpty(cookieToken))
                    {
                        context.Token = cookieToken;
                    }

                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        return services;
    }
}
