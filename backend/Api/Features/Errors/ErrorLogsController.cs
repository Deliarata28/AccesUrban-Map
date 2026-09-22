using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Api.Features.Errors;

[ApiController]
[Route(ApiRoutes.Errors)]
[Authorize(Roles = nameof(UserRole.Administrator))]
public class ErrorLogsController(AccesUrbanMapDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ErrorLogResponse>>> GetAll(
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var errors = await dbContext.ErrorLogs
            .AsNoTracking()
            .OrderByDescending(error => error.CreatedAt)
            .Take(take)
            .Select(error => ErrorLogResponse.From(error))
            .ToListAsync(cancellationToken);

        return Ok(errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ErrorLogResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var error = await dbContext.ErrorLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return error is null ? NotFound() : Ok(ErrorLogResponse.From(error));
    }
}

public sealed record ErrorLogResponse(
    int Id,
    string TraceId,
    int? UserId,
    string RequestMethod,
    string RequestPath,
    int StatusCode,
    string ExceptionType,
    string Message,
    string? StackTrace,
    DateTimeOffset CreatedAt,
    string? UserEmail,
    string? UserName)
{
    public static ErrorLogResponse From(ErrorLog error) => new(
        error.Id,
        error.TraceId,
        error.UserId,
        error.RequestMethod,
        error.RequestPath,
        error.StatusCode,
        error.ExceptionType,
        error.Message,
        error.StackTrace,
        error.CreatedAt,
        error.UserEmail,
        error.UserName);
}
