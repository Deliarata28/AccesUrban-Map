using System.Text.Json.Serialization;
using NetTopologySuite.Geometries;

namespace AccesUrbanMap.Domain;

public class Place
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    [JsonIgnore]
    public Point Geometry { get; set; } = default!;
    public PlaceSource Source { get; set; } = PlaceSource.Manual;
    public bool IsVerified { get; set; }
    public string? SeedKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Accessibility is kept on the place row so the catalog stays easy to
    // inspect and update without a one-to-one auxiliary table.
    public bool? WheelchairAccess { get; set; }
    public bool? Ramp { get; set; }
    public bool? StepFreeEntry { get; set; }
    public bool? Elevator { get; set; }
    public bool? AccessibleToilet { get; set; }
    public bool? AccessibleParking { get; set; }
    public bool? TactilePaving { get; set; }
    public bool? AudioSignal { get; set; }
    public int AccessibilityScore { get; set; }
    public DateTimeOffset AccessibilityUpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public List<Report> Reports { get; set; } = [];

    [JsonIgnore]
    public List<Photo> Photos { get; set; } = [];
}

public enum PlaceSource { Manual, OpenStreetMap, FieldSurvey, PublicData }
