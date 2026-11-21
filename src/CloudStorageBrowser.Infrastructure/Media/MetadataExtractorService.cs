using CloudStorageBrowser.Application.Common.Interfaces;
using CloudStorageBrowser.Domain.Entities;
using CloudStorageBrowser.Domain.ValueObjects;
using CloudStorageBrowser.Infrastructure.Storage;
using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using Microsoft.Extensions.Logging;

namespace CloudStorageBrowser.Infrastructure.Media;

public class MetadataExtractorService : IMetadataExtractorService
{
    private readonly ILogger<MetadataExtractorService> _logger;

    public MetadataExtractorService(ILogger<MetadataExtractorService> logger)
    {
        _logger = logger;
    }

    public Task<MediaMetadata?> ExtractMetadataAsync(
        DatasetConfig dataset,
        string relativePath,
        string? snapshotName = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var basePath = string.IsNullOrEmpty(snapshotName)
                ? dataset.Path
                : Path.Combine(dataset.Path, ".zfs", "snapshot", snapshotName);

            var cleanRel = PathSecurityHelper.NormalizeRelativePath(relativePath);
            var sourcePath = PathSecurityHelper.GetSafeFullPath(basePath, cleanRel);

            if (!File.Exists(sourcePath))
                return Task.FromResult<MediaMetadata?>(null);

            var ext = Path.GetExtension(sourcePath).ToLowerInvariant();
            if (FileCategoryHelper.GetCategory(ext) != Domain.Enums.FileCategory.Image)
            {
                return Task.FromResult<MediaMetadata?>(null);
            }

            var directories = ImageMetadataReader.ReadMetadata(sourcePath);
            var metadata = new MediaMetadata();

            // Read Exif IFD0 directory (Camera make, model, software, etc.)
            var ifd0 = directories.OfType<ExifIfd0Directory>().FirstOrDefault();
            if (ifd0 != null)
            {
                metadata.CameraMake = ifd0.GetDescription(ExifDirectoryBase.TagMake);
                metadata.CameraModel = ifd0.GetDescription(ExifDirectoryBase.TagModel);
                metadata.Software = ifd0.GetDescription(ExifDirectoryBase.TagSoftware);
            }

            // Read Exif SubIFD directory (FNumber, ISO, Exposure, Date taken, Dimensions)
            var subIfd = directories.OfType<ExifSubIfdDirectory>().FirstOrDefault();
            if (subIfd != null)
            {
                metadata.FNumber = subIfd.GetDescription(ExifDirectoryBase.TagFNumber);
                metadata.ExposureTime = subIfd.GetDescription(ExifDirectoryBase.TagExposureTime);
                metadata.IsoSpeed = subIfd.GetDescription(ExifDirectoryBase.TagIsoEquivalent);
                metadata.Lens = subIfd.GetDescription(ExifDirectoryBase.TagLensModel);

                if (subIfd.TryGetDateTime(ExifDirectoryBase.TagDateTimeOriginal, out var dateTaken))
                {
                    metadata.DateTaken = dateTaken;
                }

                if (subIfd.TryGetInt32(ExifDirectoryBase.TagExifImageWidth, out var width))
                    metadata.Width = width;

                if (subIfd.TryGetInt32(ExifDirectoryBase.TagExifImageHeight, out var height))
                    metadata.Height = height;
            }

            // Read GPS directory
            var gps = directories.OfType<GpsDirectory>().FirstOrDefault();
            if (gps != null)
            {
                var geoLocation = gps.GetGeoLocation();
                if (geoLocation.HasValue && !geoLocation.Value.IsZero)
                {
                    metadata.Latitude = geoLocation.Value.Latitude;
                    metadata.Longitude = geoLocation.Value.Longitude;
                }

                if (gps.TryGetRational(GpsDirectory.TagAltitude, out var alt))
                {
                    metadata.Altitude = alt.ToDouble();
                }
            }

            return Task.FromResult<MediaMetadata?>(metadata);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not extract metadata for {Path}", relativePath);
            return Task.FromResult<MediaMetadata?>(null);
        }
    }
}
