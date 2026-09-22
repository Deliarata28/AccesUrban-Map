using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Api.Services;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AccesUrbanMap.Api.Features.Contact;

[ApiController]
[Route(ApiRoutes.ContactMessages)]
public class ContactMessagesController(
    AccesUrbanMapDbContext dbContext,
    IEmailSender emailSender,
    IOptions<SmtpOptions> smtpOptions,
    ILogger<ContactMessagesController> logger) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ContactMessageResponse>> Create(
        CreateContactMessageRequest request,
        CancellationToken cancellationToken)
    {
        var message = new ContactMessage
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
        };

        dbContext.ContactMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        var notificationSent = false;
        try
        {
            var administratorEmail = smtpOptions.Value.User;
            if (!string.IsNullOrWhiteSpace(administratorEmail))
            {
                await emailSender.SendAsync(
                    administratorEmail,
                    $"Mesaj nou AccesUrban Map: {message.Subject}",
                    string.Join(Environment.NewLine, [
                        $"Ai primit un mesaj nou de la {message.Name}.",
                        $"E-mail: {message.Email}",
                        $"Subiect: {message.Subject}",
                        "",
                        message.Message,
                        "",
                        $"Mesaj salvat în panoul de administrare cu numărul #{message.Id}."
                    ]),
                    replyTo: message.Email,
                    cancellationToken: cancellationToken);
                notificationSent = true;
            }
        }
        catch (EmailDeliveryException exception)
        {
            logger.LogError(
                exception,
                "Mesajul de contact #{MessageId} a fost salvat, dar notificarea către administrator nu a putut fi trimisă.",
                message.Id);
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = message.Id },
            ToResponse(message, notificationSent));
    }

    [HttpGet]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<IReadOnlyList<ContactMessageResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var messages = (await dbContext.ContactMessages
            .AsNoTracking()
            .OrderBy(message => message.Status == ContactMessageStatus.New ? 0 : 1)
            .ThenByDescending(message => message.CreatedAt)
            .ToListAsync(cancellationToken))
            .Select(message => ToResponse(message, false))
            .ToList();

        return Ok(messages);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<ContactMessageResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var message = await dbContext.ContactMessages
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return message is null ? NotFound() : Ok(ToResponse(message, false));
    }

    [HttpPut("{id:int}/read")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<ContactMessageResponse>> MarkRead(
        int id,
        CancellationToken cancellationToken)
    {
        var message = await dbContext.ContactMessages.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (message is null)
            return NotFound();

        if (message.Status == ContactMessageStatus.New)
        {
            message.Status = ContactMessageStatus.Read;
            message.ReadAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(ToResponse(message, false));
    }

    [HttpPost("{id:int}/reply")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<ContactMessageResponse>> Reply(
        int id,
        ReplyContactMessageRequest request,
        CancellationToken cancellationToken)
    {
        var message = await dbContext.ContactMessages.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (message is null)
            return NotFound();

        var reply = request.Message.Trim();
        await emailSender.SendAsync(
            message.Email,
            $"Răspuns AccesUrban Map: {message.Subject}",
            reply,
            replyTo: smtpOptions.Value.FromEmail,
            cancellationToken: cancellationToken);

        message.Status = ContactMessageStatus.Replied;
        message.ReadAt ??= DateTimeOffset.UtcNow;
        message.RepliedAt = DateTimeOffset.UtcNow;
        message.RepliedByUserId = GetCurrentUserId();
        message.LastReply = reply;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(message, false));
    }

    private int? GetCurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static ContactMessageResponse ToResponse(ContactMessage message, bool notificationSent) => new(
        message.Id,
        message.Name,
        message.Email,
        message.Subject,
        message.Message,
        message.Status.ToString(),
        message.LastReply,
        message.CreatedAt,
        message.ReadAt,
        message.RepliedAt,
        notificationSent);
}

public class CreateContactMessageRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(200, MinimumLength = 2)]
    public string Subject { get; set; } = string.Empty;

    [Required, StringLength(4000, MinimumLength = 10)]
    public string Message { get; set; } = string.Empty;
}

public class ReplyContactMessageRequest
{
    [Required, StringLength(4000, MinimumLength = 2)]
    public string Message { get; set; } = string.Empty;
}

public record ContactMessageResponse(
    int Id,
    string Name,
    string Email,
    string Subject,
    string Message,
    string Status,
    string? LastReply,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt,
    DateTimeOffset? RepliedAt,
    bool NotificationSent);
