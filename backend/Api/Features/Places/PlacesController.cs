using AccesUrbanMap.Domain;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Infrastructure.Persistence;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace AccesUrbanMap.Api.Features.Places;

[ApiController]
[Route(ApiRoutes.Places)]
public class PlacesController(AccesUrbanMapDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PlaceResponse>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] bool? wheelchair,
        [FromQuery] int? minScore,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Places.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(place => place.Category == category);
        if (wheelchair is not null)
            query = query.Where(place => place.WheelchairAccess == wheelchair.Value);
        if (minScore is not null)
            query = query.Where(place => place.AccessibilityScore >= minScore);

        var places = await query.OrderBy(place => place.Name).ToListAsync(cancellationToken);
        return Ok(places.Select(ToResponse).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlaceResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var place = await dbContext.Places.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return place is null ? NotFound() : Ok(ToResponse(place));
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<PlaceResponse>>> Search([FromQuery, Required, StringLength(160)] string query, CancellationToken cancellationToken)
    {
        var value = query.Trim();
        var places = await dbContext.Places
            .Where(place => EF.Functions.ILike(place.Name, $"%{value}%") ||
                            EF.Functions.ILike(place.Address, $"%{value}%") ||
                            EF.Functions.ILike(place.Category, $"%{value}%"))
            .OrderBy(place => place.Name)
            .ToListAsync(cancellationToken);

        return Ok(places.Select(ToResponse).ToList());
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<PlaceResponse>> Create(CreatePlaceRequest request, CancellationToken cancellationToken)
    {
        var place = new Place
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Geometry = CreatePoint(request.Latitude, request.Longitude),
            Source = request.Source,
            IsVerified = request.IsVerified
        };

        if (request.Accessibility is not null)
            ApplyAccessibility(place, request.Accessibility);

        dbContext.Places.Add(place);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = place.Id }, ToResponse(place));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<PlaceResponse>> Update(int id, UpdatePlaceRequest request, CancellationToken cancellationToken)
    {
        var place = await dbContext.Places.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (place is null)
            return NotFound();

        place.Name = request.Name.Trim();
        place.Description = request.Description.Trim();
        place.Category = request.Category.Trim();
        place.Address = request.Address.Trim();
        place.Latitude = request.Latitude;
        place.Longitude = request.Longitude;
        place.Geometry = CreatePoint(request.Latitude, request.Longitude);
        place.Source = request.Source;
        place.IsVerified = request.IsVerified;

        if (request.Accessibility is not null)
            ApplyAccessibility(place, request.Accessibility);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(place));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var place = await dbContext.Places.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (place is null)
            return NotFound();

        dbContext.Places.Remove(place);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    internal static void ApplyAccessibility(Place place, AccessibilityRequest request)
    {
        place.WheelchairAccess = request.WheelchairAccess ??
            (request.StepFreeEntry == true && request.Ramp != false ? true :
                request.StepFreeEntry == false ? false : null);
        place.Ramp = request.Ramp;
        place.StepFreeEntry = request.StepFreeEntry;
        place.Elevator = request.Elevator;
        place.AccessibleToilet = request.AccessibleToilet;
        place.AccessibleParking = request.AccessibleParking;
        place.TactilePaving = request.TactilePaving;
        place.AudioSignal = request.AudioSignal;
        place.AccessibilityScore = CalculateScore(request);
    }

    internal static int CalculateScore(AccessibilityRequest request) =>
        (request.WheelchairAccess == true ? 20 : 0) +
        (request.Ramp == true ? 15 : 0) +
        (request.StepFreeEntry == true ? 20 : 0) +
        (request.Elevator == true ? 10 : 0) +
        (request.AccessibleToilet == true ? 15 : 0) +
        (request.AccessibleParking == true ? 10 : 0) +
        (request.TactilePaving == true ? 5 : 0) +
        (request.AudioSignal == true ? 5 : 0);

    internal static AccessibilityResponse ToAccessibilityResponse(Place place) => new(
        place.WheelchairAccess,
        place.Ramp,
        place.StepFreeEntry,
        place.Elevator,
        place.AccessibleToilet,
        place.AccessibleParking,
        place.TactilePaving,
        place.AudioSignal,
        place.AccessibilityScore,
        place.AccessibilityUpdatedAt);

    private static PlaceResponse ToResponse(Place place) => new(
        place.Id,
        place.Name,
        place.Description,
        place.Category,
        place.Address,
        place.Latitude,
        place.Longitude,
        place.Source,
        place.IsVerified,
        place.CreatedAt,
        place.UpdatedAt,
        ToAccessibilityResponse(place));

    private static Point CreatePoint(decimal latitude, decimal longitude) =>
        new((double)longitude, (double)latitude) { SRID = 4326 };

}

public sealed record AccessibilityResponse(
    bool? WheelchairAccess,
    bool? Ramp,
    bool? StepFreeEntry,
    bool? Elevator,
    bool? AccessibleToilet,
    bool? AccessibleParking,
    bool? TactilePaving,
    bool? AudioSignal,
    int Score,
    DateTimeOffset UpdatedAt);

public sealed record PlaceResponse(
    int Id,
    string Name,
    string Description,
    string Category,
    string Address,
    decimal Latitude,
    decimal Longitude,
    PlaceSource Source,
    bool IsVerified,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    AccessibilityResponse Accessibility);

public abstract class PlaceRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(2000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required, StringLength(240, MinimumLength = 3)]
    public string Address { get; set; } = string.Empty;

    [Range(typeof(decimal), "-90", "90")]
    public decimal Latitude { get; set; }

    [Range(typeof(decimal), "-180", "180")]
    public decimal Longitude { get; set; }

    public PlaceSource Source { get; set; } = PlaceSource.Manual;
    public bool IsVerified { get; set; }
}

public class CreatePlaceRequest : PlaceRequest
{
    public AccessibilityRequest? Accessibility { get; set; }
}

public class UpdatePlaceRequest : PlaceRequest
{
    public AccessibilityRequest? Accessibility { get; set; }
}

public class AccessibilityRequest
{
    public bool? WheelchairAccess { get; set; }
    public bool? Ramp { get; set; }
    public bool? StepFreeEntry { get; set; }
    public bool? Elevator { get; set; }
    public bool? AccessibleToilet { get; set; }
    public bool? AccessibleParking { get; set; }
    public bool? TactilePaving { get; set; }
    public bool? AudioSignal { get; set; }
}
