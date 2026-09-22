using AccesUrbanMap.Application.Services.Routes;
using AccesUrbanMap.Api.Endpoints;
using Microsoft.AspNetCore.Mvc;

namespace AccesUrbanMap.Api.Features.Routes;

[ApiController]
[Route(ApiRoutes.Routes)]
public class RoutesController(RouteService routeService) : ControllerBase
{
    [HttpPost]
    public ActionResult<RouteResult> Create(RouteRequest request)
    {
        if (request.Profile is not "wheelchair" and not "walking")
            return BadRequest(new { message = "Profilul trebuie sa fie wheelchair sau walking." });
        if (!IsValid(request.Origin) || !IsValid(request.Destination))
            return BadRequest(new { message = "Coordonatele nu sunt valide." });

        return Ok(routeService.Create(request));
    }

    private static bool IsValid(RoutePoint point) =>
        point.Latitude is >= -90 and <= 90 && point.Longitude is >= -180 and <= 180;
}
