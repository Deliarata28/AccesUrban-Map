using System.Text.Json.Serialization;

namespace AccesUrbanMap.Domain;

public class ContactMessage
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public ContactMessageStatus Status { get; set; } = ContactMessageStatus.New;
    public string? LastReply { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset? RepliedAt { get; set; }

    [JsonIgnore]
    public int? RepliedByUserId { get; set; }

    [JsonIgnore]
    public User? RepliedByUser { get; set; }
}

public enum ContactMessageStatus
{
    New,
    Read,
    Replied
}
