using AccesUrbanMap.Domain;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Infrastructure.Persistence;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Api.Features.Photos;

[ApiController]
[Route(ApiRoutes.Photos)]
public class PhotosController(AccesUrbanMapDbContext dbContext, IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Photo>>> GetAll([FromQuery] int? placeId, [FromQuery] int? reportId, CancellationToken cancellationToken)
    {
        var query = dbContext.Photos.AsQueryable();
        if (placeId is not null) query = query.Where(photo => photo.PlaceId == placeId);
        if (reportId is not null) query = query.Where(photo => photo.ReportId == reportId);
        return Ok(await query.OrderByDescending(photo => photo.CreatedAt).ToListAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Photo>> Create(CreatePhotoRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "URL-ul fotografiei este obligatoriu." });
        if (request.PlaceId is null && request.ReportId is null)
            return BadRequest(new { message = "Fotografia trebuie asociata cu o locatie sau un raport." });

        if (request.PlaceId is not null && !await dbContext.Places.AnyAsync(place => place.Id == request.PlaceId, cancellationToken))
            return BadRequest(new { message = "Locatia selectata nu exista." });

        if (request.ReportId is not null)
        {
            var report = await dbContext.Reports.FirstOrDefaultAsync(item => item.Id == request.ReportId, cancellationToken);
            if (report is null)
                return BadRequest(new { message = "Raportul selectat nu exista." });

            var userIdText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdText, out var userId))
                return Unauthorized();
            if (!User.IsInRole(nameof(UserRole.Administrator)) && report.UserId != userId)
                return Forbid();
        }

        var photo = new Photo { PlaceId = request.PlaceId, ReportId = request.ReportId, Url = request.Url.Trim() };
        dbContext.Photos.Add(photo);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = photo.Id }, photo);
    }

    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<ActionResult<UploadPhotoResponse>> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            return BadRequest(new { message = "Alege o fotografie." });
        if (file.Length > 2 * 1024 * 1024)
            return BadRequest(new { message = "Fotografia poate avea maximum 2 MB." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedFiles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };
        if (!allowedFiles.TryGetValue(extension, out var expectedContentType) ||
            !string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Sunt acceptate numai imaginile PNG, JPEG sau WebP." });
        }

        var uploadsDirectory = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads");
        Directory.CreateDirectory(uploadsDirectory);

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var storedFilePath = Path.Combine(uploadsDirectory, storedFileName);
        await using (var output = System.IO.File.Create(storedFilePath))
        {
            await file.CopyToAsync(output, cancellationToken);
        }

        var url = $"{Request.Scheme}://{Request.Host}/uploads/{storedFileName}";
        return Ok(new UploadPhotoResponse(url));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Photo>> GetById(int id, CancellationToken cancellationToken)
    {
        var photo = await dbContext.Photos.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return photo is null ? NotFound() : Ok(photo);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = nameof(UserRole.Administrator))]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var photo = await dbContext.Photos.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (photo is null) return NotFound();
        dbContext.Photos.Remove(photo);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

public class CreatePhotoRequest
{
    public int? PlaceId { get; set; }
    public int? ReportId { get; set; }
    [Required, Url, StringLength(2048)]
    public string Url { get; set; } = string.Empty;
}

public record UploadPhotoResponse(string Url);
