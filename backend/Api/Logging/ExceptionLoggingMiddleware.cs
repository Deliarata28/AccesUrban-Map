using System.Security.Claims;
using AccesUrbanMap.Api.Services;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;

namespace AccesUrbanMap.Api.Logging;

public class ExceptionLoggingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, AccesUrbanMapDbContext dbContext)
    {
        var errorSaved = false;

        context.Response.OnStarting(() =>
        {
            if (context.Response.StatusCode >= StatusCodes.Status400BadRequest)
                context.Response.Headers["X-Trace-Id"] = context.TraceIdentifier;
            return Task.CompletedTask;
        });

        try
        {
            await next(context);

            if (context.Response.StatusCode >= StatusCodes.Status400BadRequest)
            {
                await SaveErrorSafelyAsync(context, dbContext, null);
                errorSaved = true;
            }
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (context.Response.HasStarted)
        {
            await SaveErrorSafelyAsync(context, dbContext, exception);
            errorSaved = true;
            logger.LogError(
                exception,
                "Eroare necontrolata dupa inceperea raspunsului. TraceId: {TraceId}",
                context.TraceIdentifier);
            throw;
        }
        catch (Exception exception)
        {
            await SaveErrorSafelyAsync(context, dbContext, exception);
            errorSaved = true;

            var errorCode = exception is EmailDeliveryException
                ? "EMAIL_DELIVERY_FAILED"
                : "SERVER_ERROR";

            logger.LogError(
                exception,
                "Eroare necontrolata. TraceId: {TraceId}; UserId: {UserId}; User: {UserName}; Email: {UserEmail}; {RequestMethod} {RequestPath}",
                context.TraceIdentifier,
                CurrentUserId(context),
                CurrentUserName(context),
                CurrentUserEmail(context),
                context.Request.Method,
                context.Request.Path);

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            context.Response.Headers["X-Trace-Id"] = context.TraceIdentifier;

            var userMessage = exception is EmailDeliveryException
                ? "Nu putem trimite e-mailul momentan. Încearcă din nou peste puțin timp."
                : "Nu am putut finaliza acțiunea. Păstrează Trace ID-ul dacă ai nevoie de ajutor.";

            await context.Response.WriteAsJsonAsync(new ErrorResponse(
                userMessage,
                context.TraceIdentifier,
                errorCode));
        }
        finally
        {
            if (!errorSaved && context.Response.StatusCode >= StatusCodes.Status400BadRequest)
                await SaveErrorSafelyAsync(context, dbContext, null);
        }
    }

    private async Task SaveErrorSafelyAsync(
        HttpContext context,
        AccesUrbanMapDbContext dbContext,
        Exception? exception)
    {
        try
        {
            await SaveErrorAsync(context, dbContext, exception);
        }
        catch (Exception loggingException)
        {
            logger.LogError(
                loggingException,
                "Eroarea nu a putut fi salvată în error_logs. TraceId: {TraceId}",
                context.TraceIdentifier);
        }
    }

    private static async Task SaveErrorAsync(
        HttpContext context,
        AccesUrbanMapDbContext dbContext,
        Exception? exception)
    {
        dbContext.ErrorLogs.Add(new ErrorLog
        {
            TraceId = Limit(context.TraceIdentifier, 128),
            UserId = CurrentUserId(context),
            RequestMethod = Limit(context.Request.Method, 16),
            RequestPath = Limit(context.Request.Path.Value ?? "/", 2048),
            StatusCode = exception is null
                ? context.Response.StatusCode
                : StatusCodes.Status500InternalServerError,
            ExceptionType = Limit(exception?.GetType().FullName ?? "HttpError", 512),
            Message = Limit(exception?.Message ?? $"HTTP {context.Response.StatusCode}", 4000),
            StackTrace = exception?.ToString(),
            UserEmail = LimitNullable(CurrentUserEmail(context), 320),
            UserName = LimitNullable(CurrentUserName(context), 160),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await dbContext.SaveChangesAsync(CancellationToken.None);
    }

    private static int? CurrentUserId(HttpContext context)
    {
        var value = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static string CurrentUserName(HttpContext context) =>
        context.User.FindFirst(ClaimTypes.Name)?.Value ?? "anonymous";

    private static string CurrentUserEmail(HttpContext context) =>
        context.User.FindFirst(ClaimTypes.Email)?.Value ?? "-";

    private static string Limit(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private static string? LimitNullable(string? value, int maxLength) =>
        value is null ? null : Limit(value, maxLength);
}

public record ErrorResponse(string Message, string TraceId, string Code);
