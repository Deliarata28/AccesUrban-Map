using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Api.Features.Health;

[ApiController]
[Route(ApiRoutes.Health)]
public class HealthController(AccesUrbanMapDbContext dbContext, ILogger<HealthController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<HealthResponse>> Get(CancellationToken cancellationToken)
    {
        try
        {
            var databaseConnected = await dbContext.Database.CanConnectAsync(cancellationToken);
            if (!databaseConnected)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new HealthResponse("Unhealthy", "Unavailable", DateTimeOffset.UtcNow));
            }

            return Ok(new HealthResponse("Healthy", "Connected", DateTimeOffset.UtcNow));
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Verificarea bazei de date a esuat. TraceId: {TraceId}", HttpContext.TraceIdentifier);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new HealthResponse("Unhealthy", "Unavailable", DateTimeOffset.UtcNow));
        }
    }
}

public record HealthResponse(string Status, string Database, DateTimeOffset CheckedAt);
