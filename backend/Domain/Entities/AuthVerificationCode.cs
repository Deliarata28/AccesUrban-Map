using System.Text.Json.Serialization;

namespace AccesUrbanMap.Domain;

public class AuthVerificationCode
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string ChallengeHash { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
    public int FailedAttempts { get; set; }

    [JsonIgnore]
    public User User { get; set; } = default!;
}
