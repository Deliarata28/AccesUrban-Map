using System.Text.Json.Serialization;
using NetTopologySuite.Geometries;

namespace AccesUrbanMap.Domain;

public class Report
{
    public int Id { get; set; }
    public int? PlaceId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    [JsonIgnore]
    public Point? Geometry { get; set; }
    public int UserId { get; set; }
    public int? ReviewedByUserId { get; set; }
    public ReportType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public string? ModeratorNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public Place? Place { get; set; }

    [JsonIgnore]
    public User User { get; set; } = default!;

    [JsonIgnore]
    public User? ReviewedByUser { get; set; }

    [JsonIgnore]
    public List<Photo> Photos { get; set; } = [];
}

public enum ReportType { BlockedRamp, DamagedSidewalk, BrokenElevator, WrongInformation, Other }
public enum ReportStatus { Pending, Approved, Rejected }
