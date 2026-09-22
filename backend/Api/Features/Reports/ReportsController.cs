using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace AccesUrbanMap.Api.Features.Reports;

[ApiController]
[Route(ApiRoutes.Reports)]
public class ReportsController(AccesUrbanMapDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<IReadOnlyList<ReportResponse>>> GetAll(
        [FromQuery] ReportStatus? status,
        [FromQuery] int? placeId,
        CancellationToken cancellationToken)
    {
        var query = QueryReports();
        if (status is not null) query = query.Where(report => report.Status == status);
        if (placeId is not null) query = query.Where(report => report.PlaceId == placeId);

        var reports = await query
            .OrderByDescending(report => report.CreatedAt)
            .ToListAsync(cancellationToken);
        return Ok(reports.Select(ReportResponse.From).ToList());
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<ReportResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var report = await QueryReports().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return report is null ? NotFound() : Ok(ReportResponse.From(report));
    }

    [HttpGet("mine")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<ReportResponse>>> GetMine(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var reports = await QueryReports()
            .Where(report => report.UserId == userId)
            .OrderByDescending(report => report.CreatedAt)
            .ToListAsync(cancellationToken);
        return Ok(reports.Select(ReportResponse.From).ToList());
    }

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<PublicReportResponse>>> GetPublic(CancellationToken cancellationToken)
    {
        var reports = await QueryReports()
            .Where(report => report.Status == ReportStatus.Approved)
            .OrderByDescending(report => report.UpdatedAt)
            .ToListAsync(cancellationToken);
        return Ok(reports.Select(PublicReportResponse.From).ToList());
    }

    [HttpPost("submit")]
    [Authorize]
    public async Task<ActionResult<ReportResponse>> Submit(SubmitReportRequest request, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        Place? place = null;
        if (request.PlaceId is not null)
        {
            place = await dbContext.Places.FirstOrDefaultAsync(item => item.Id == request.PlaceId, cancellationToken);
            if (place is null) return BadRequest(new { message = "Locatia selectata nu exista." });
        }

        var latitude = place?.Latitude ?? request.Latitude;
        var longitude = place?.Longitude ?? request.Longitude;
        var locationName = place?.Name ?? request.LocationName?.Trim();
        if (string.IsNullOrWhiteSpace(locationName) || latitude is null || longitude is null)
            return BadRequest(new { message = "Pentru un punct liber sunt necesare numele si coordonatele." });

        var report = new Report
        {
            PlaceId = place?.Id,
            LocationName = locationName,
            Latitude = latitude,
            Longitude = longitude,
            Geometry = CreatePoint(latitude.Value, longitude.Value),
            UserId = userId.Value,
            Type = request.Type,
            Description = request.Description.Trim()
        };

        dbContext.Reports.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);

        var savedReport = await QueryReports().FirstAsync(item => item.Id == report.Id, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ReportResponse.From(savedReport));
    }

    [HttpPut("{id:int}/approve")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public Task<ActionResult<ReportResponse>> Approve(
        int id,
        ModerateReportRequest? request,
        CancellationToken cancellationToken) => ChangeStatus(
        id,
        ReportStatus.Approved,
        request?.ModeratorNote,
        cancellationToken);

    [HttpPut("{id:int}/reject")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<ActionResult<ReportResponse>> Reject(
        int id,
        ModerateReportRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ModeratorNote))
            return BadRequest(new { message = "Motivul respingerii este obligatoriu." });

        return await ChangeStatus(id, ReportStatus.Rejected, request.ModeratorNote, cancellationToken);
    }

    private async Task<ActionResult<ReportResponse>> ChangeStatus(
        int id,
        ReportStatus status,
        string? moderatorNote,
        CancellationToken cancellationToken)
    {
        var report = await dbContext.Reports.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (report is null) return NotFound();

        var reviewerId = CurrentUserId();
        if (reviewerId is null) return Unauthorized();

        report.Status = status;
        report.ReviewedByUserId = reviewerId;
        report.ModeratorNote = string.IsNullOrWhiteSpace(moderatorNote)
            ? null
            : moderatorNote.Trim();
        await dbContext.SaveChangesAsync(cancellationToken);

        var savedReport = await QueryReports().FirstAsync(item => item.Id == id, cancellationToken);
        return Ok(ReportResponse.From(savedReport));
    }

    private IQueryable<Report> QueryReports() => dbContext.Reports
        .AsNoTracking()
        .Include(report => report.Place)
        .Include(report => report.User)
        .Include(report => report.Photos);

    private int? CurrentUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static Point CreatePoint(decimal latitude, decimal longitude) =>
        new((double)longitude, (double)latitude) { SRID = 4326 };

}

public class SubmitReportRequest
{
    public int? PlaceId { get; set; }

    [StringLength(240, MinimumLength = 3)]
    public string? LocationName { get; set; }

    [Range(typeof(decimal), "-90", "90")]
    public decimal? Latitude { get; set; }

    [Range(typeof(decimal), "-180", "180")]
    public decimal? Longitude { get; set; }

    public ReportType Type { get; set; }

    [Required, StringLength(2000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;
}

public class ModerateReportRequest
{
    [StringLength(1000)]
    public string? ModeratorNote { get; set; }
}

public record ReportResponse(
    int Id,
    int? PlaceId,
    string LocationName,
    decimal? Latitude,
    decimal? Longitude,
    int UserId,
    string UserName,
    ReportType Type,
    string Description,
    ReportStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string? PhotoUrl,
    int? ReviewedByUserId,
    string? ModeratorNote)
{
    public static ReportResponse From(Report report) => new(
        report.Id,
        report.PlaceId,
        report.Place?.Name ?? report.LocationName,
        report.Latitude ?? report.Place?.Latitude,
        report.Longitude ?? report.Place?.Longitude,
        report.UserId,
        report.User.Name,
        report.Type,
        report.Description,
        report.Status,
        report.CreatedAt,
        report.UpdatedAt,
        report.Photos.OrderByDescending(photo => photo.CreatedAt).FirstOrDefault()?.Url,
        report.ReviewedByUserId,
        report.ModeratorNote);
}

public record PublicReportResponse(
    int Id,
    int? PlaceId,
    string LocationName,
    decimal? Latitude,
    decimal? Longitude,
    ReportType Type,
    string Description,
    DateTimeOffset UpdatedAt,
    string? PhotoUrl)
{
    public static PublicReportResponse From(Report report) => new(
        report.Id,
        report.PlaceId,
        report.Place?.Name ?? report.LocationName,
        report.Latitude ?? report.Place?.Latitude,
        report.Longitude ?? report.Place?.Longitude,
        report.Type,
        report.Description,
        report.UpdatedAt,
        report.Photos.OrderByDescending(photo => photo.CreatedAt).FirstOrDefault()?.Url);
}
