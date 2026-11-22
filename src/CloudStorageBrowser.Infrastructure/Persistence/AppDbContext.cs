using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudStorageBrowser.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<DatasetConfig> Datasets => Set<DatasetConfig>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();
    public DbSet<FolderStatsCache> FolderStatsCaches => Set<FolderStatsCache>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FolderStatsCache>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DatasetId, e.SnapshotName, e.RelativePath }).IsUnique();
            entity.Property(e => e.RelativePath).IsRequired();
            entity.Property(e => e.SnapshotName).IsRequired().HasDefaultValue(string.Empty);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).HasConversion<int>();
        });

        modelBuilder.Entity<DatasetConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Path).IsRequired();
            entity.Property(e => e.AccessMode).HasConversion<int>();
        });

        modelBuilder.Entity<AppSetting>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.Property(e => e.Key).IsRequired().HasMaxLength(100);
        });
    }
}
