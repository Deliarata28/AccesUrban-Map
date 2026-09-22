using System.Text.Json.Serialization;

namespace AccesUrbanMap.Domain;

public class Photo
{
    public int Id { get; set; }
    public int? PlaceId { get; set; }
    public int? ReportId { get; set; }
    public string Url { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public Place? Place { get; set; }

    [JsonIgnore]
    public Report? Report { get; set; }
}
