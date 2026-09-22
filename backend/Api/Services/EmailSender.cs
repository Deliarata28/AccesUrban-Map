using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using Microsoft.Extensions.Options;

namespace AccesUrbanMap.Api.Services;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "accesurbanmap@gmail.com";
    public string FromName { get; set; } = "AccesUrban Map";
}

public interface IEmailSender
{
    Task SendAsync(
        string recipient,
        string subject,
        string body,
        string? replyTo = null,
        bool isHtml = false,
        bool includeBrandLogo = false,
        CancellationToken cancellationToken = default);
}

public sealed class SmtpEmailSender(
    IOptions<SmtpOptions> options,
    IWebHostEnvironment environment,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(
        string recipient,
        string subject,
        string body,
        string? replyTo = null,
        bool isHtml = false,
        bool includeBrandLogo = false,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.Host) ||
            string.IsNullOrWhiteSpace(settings.User) ||
            string.IsNullOrWhiteSpace(settings.Password))
        {
            throw new EmailDeliveryException(
                "Serviciul de e-mail nu este configurat. Adaugă datele SMTP în User Secrets.");
        }

        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.EnableSsl,
            Credentials = new NetworkCredential(settings.User, settings.Password),
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };
        using var message = new MailMessage
        {
            From = new MailAddress(settings.FromEmail, settings.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = isHtml,
        };

        if (isHtml && includeBrandLogo)
        {
            var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
            var logoFileName = "accessurban-accessibility-logo-clean.png";
            var logoPath = new[]
                {
                    Path.Combine(AppContext.BaseDirectory, "wwwroot", "brand", logoFileName),
                    Path.Combine(webRoot, "brand", logoFileName),
                }
                .FirstOrDefault(File.Exists);

            if (logoPath is not null)
            {
                message.Body = "Codul de conectare AccesUrban Map este disponibil în versiunea HTML a acestui mesaj.";
                message.IsBodyHtml = false;
                var htmlView = AlternateView.CreateAlternateViewFromString(
                    body,
                    Encoding.UTF8,
                    MediaTypeNames.Text.Html);
                htmlView.LinkedResources.Add(new LinkedResource(logoPath, MediaTypeNames.Image.Png)
                {
                    ContentId = "accesurban-logo",
                    TransferEncoding = TransferEncoding.Base64,
                });
                message.AlternateViews.Add(htmlView);
            }
            else
            {
                logger.LogWarning("Logo-ul AccesUrban Map nu a fost găsit pentru e-mailul către {Recipient}.", recipient);
            }
        }

        message.To.Add(new MailAddress(recipient));
        if (!string.IsNullOrWhiteSpace(replyTo))
            message.ReplyToList.Add(new MailAddress(replyTo));

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException)
        {
            logger.LogError(exception, "Trimiterea e-mailului către {Recipient} a eșuat.", recipient);
            throw new EmailDeliveryException("E-mailul nu a putut fi trimis.", exception);
        }
    }
}

public sealed class EmailDeliveryException(string message, Exception? innerException = null)
    : Exception(message, innerException);
