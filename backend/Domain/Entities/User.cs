using System.Text.Json.Serialization;

namespace AccesUrbanMap.Domain;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public AccessibilityProfile AccessibilityProfile { get; set; } = AccessibilityProfile.Wheelchair;
    public string? AvatarUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public List<Report> Reports { get; set; } = [];

    [JsonIgnore]
    public List<Report> ReviewedReports { get; set; } = [];
}

public enum UserRole { User, Administrator }
public enum AccessibilityProfile { Wheelchair, WalkingAid, VisualImpairment }
