using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Api.Features.Places;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Api.Features.Accessibility;

[ApiController]
[Route(ApiRoutes.Accessibility)]
public class AccessibilityController(AccesUrbanMapDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AccessibilityResponse>> Get(int placeId, CancellationToken cancellationToken)
    {
        var place = await dbContext.Places
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == placeId, cancellationToken);

        return place is null
            ? NotFound()
            : Ok(PlacesController.ToAccessibilityResponse(place));
    }

    [HttpPut]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<AccessibilityResponse>> Update(
        int placeId,
        AccessibilityRequest request,
        CancellationToken cancellationToken)
    {
        var place = await dbContext.Places
            .FirstOrDefaultAsync(item => item.Id == placeId, cancellationToken);
        if (place is null)
            return NotFound();

        PlacesController.ApplyAccessibility(place, request);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(PlacesController.ToAccessibilityResponse(place));
    }
}
