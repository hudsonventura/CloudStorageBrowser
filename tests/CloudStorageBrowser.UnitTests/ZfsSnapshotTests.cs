using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.Enums;
using CloudStorageBrowser.Infrastructure.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CloudStorageBrowser.UnitTests;

public class ZfsSnapshotTests : IDisposable
{
    private readonly string _tempDir;
    private readonly ZfsSnapshotService _service;
    private readonly DatasetConfig _dataset;

    public ZfsSnapshotTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"zfs_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _dataset = new DatasetConfig
        {
            Id = 1,
            Name = "TestTank",
            Path = _tempDir,
            AccessMode = DatasetAccessMode.ReadWrite
        };

        _service = new ZfsSnapshotService(NullLogger<ZfsSnapshotService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            try { Directory.Delete(_tempDir, recursive: true); } catch { }
        }
    }

    [Fact]
    public async Task HasSnapshotsAsync_ReturnsFalse_WhenNoSnapshotDir()
    {
        var hasSnapshots = await _service.HasSnapshotsAsync(_dataset);
        Assert.False(hasSnapshots);
    }

    [Fact]
    public async Task HasSnapshotsAsync_ReturnsTrue_WhenSnapshotDirExists()
    {
        var snapDir = Path.Combine(_tempDir, ".zfs", "snapshot");
        Directory.CreateDirectory(snapDir);

        var hasSnapshots = await _service.HasSnapshotsAsync(_dataset);
        Assert.True(hasSnapshots);
    }

    [Fact]
    public async Task GetVersionsAsync_FiltersUnmodifiedSnapshots_WhenOnlyModifiedIsTrue()
    {
        var snapRoot = Path.Combine(_tempDir, ".zfs", "snapshot");
        var snap1 = Path.Combine(snapRoot, "auto-2026-11-19_00-00");
        var snap2 = Path.Combine(snapRoot, "auto-2026-11-20_00-00");
        var snap3 = Path.Combine(snapRoot, "auto-2026-11-21_00-00");

        Directory.CreateDirectory(snap1);
        Directory.CreateDirectory(snap2);
        Directory.CreateDirectory(snap3);

        var relPath = "documento.txt";
        var file1 = Path.Combine(snap1, relPath);
        var file2 = Path.Combine(snap2, relPath);
        var file3 = Path.Combine(snap3, relPath);

        // Version 1: 10 bytes, created Nov 19
        File.WriteAllText(file1, "Versao 1!!");
        File.SetLastWriteTimeUtc(file1, new DateTime(2026, 11, 19, 10, 0, 0, DateTimeKind.Utc));

        // Version 2: Identical to Version 1 (TrueNAS daily snapshot without change)
        File.WriteAllText(file2, "Versao 1!!");
        File.SetLastWriteTimeUtc(file2, new DateTime(2026, 11, 19, 10, 0, 0, DateTimeKind.Utc));

        // Version 3: Modified! 20 bytes, modified Nov 21
        File.WriteAllText(file3, "Versao 3 com alteracao!!");
        File.SetLastWriteTimeUtc(file3, new DateTime(2026, 11, 21, 15, 0, 0, DateTimeKind.Utc));

        // When onlyModified is false, all 3 snapshots are listed
        var allVersions = await _service.GetVersionsAsync(_dataset, relPath, onlyModified: false);
        Assert.Equal(3, allVersions.Count);

        // When onlyModified is true, the unmodified snapshot is filtered out!
        var modifiedOnly = await _service.GetVersionsAsync(_dataset, relPath, onlyModified: true);
        Assert.Equal(2, modifiedOnly.Count);
        Assert.Contains(modifiedOnly, x => x.SnapshotName == "auto-2026-11-21_00-00");
        Assert.Contains(modifiedOnly, x => x.SnapshotName == "auto-2026-11-19_00-00");
        Assert.DoesNotContain(modifiedOnly, x => x.SnapshotName == "auto-2026-11-20_00-00");
    }

    [Fact]
    public async Task OpenSnapshotReadAsync_ReturnsExactSnapshotContent()
    {
        var snapRoot = Path.Combine(_tempDir, ".zfs", "snapshot");
        var snap1 = Path.Combine(snapRoot, "auto-2026-11-19_00-00");
        Directory.CreateDirectory(snap1);

        var relPath = "relatorio.txt";
        File.WriteAllText(Path.Combine(snap1, relPath), "Conteudo da versao do dia 19");

        var (stream, contentType, fileName) = await _service.OpenSnapshotReadAsync(_dataset, relPath, "auto-2026-11-19_00-00");
        using var reader = new StreamReader(stream);
        var content = await reader.ReadToEndAsync();

        Assert.Equal("Conteudo da versao do dia 19", content);
        Assert.Equal("relatorio.txt", fileName);
        Assert.Equal("text/plain", contentType);
    }
}
