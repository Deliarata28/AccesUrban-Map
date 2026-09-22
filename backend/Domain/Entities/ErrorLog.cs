namespace AccesUrbanMap.Domain;

public class ErrorLog
{
    public int Id { get; set; }
    public string TraceId { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string RequestMethod { get; set; } = string.Empty;
    public string RequestPath { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ExceptionType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? UserEmail { get; set; }
    public string? UserName { get; set; }
}
