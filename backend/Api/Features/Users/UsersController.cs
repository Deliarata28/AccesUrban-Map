using AccesUrbanMap.Domain;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Infrastructure.Persistence;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Api.Features.Users;

[ApiController]
[Route(ApiRoutes.Users)]
[Authorize(Roles = nameof(UserRole.Administrator))]
public class UsersController(AccesUrbanMapDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await dbContext.Users.AsNoTracking().OrderBy(user => user.Name)
            .Select(user => new UserResponse(
                user.Id,
                user.Name,
                user.Email,
                user.Role,
                user.AccessibilityProfile,
                user.AvatarUrl,
                user.CreatedAt))
            .ToListAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return user is null ? NotFound() : Ok(UserResponse.From(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!TryValidateAccount(request.Name, request.Email, out var validationProblem))
            return validationProblem;
        if (string.IsNullOrWhiteSpace(request.Password))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.Password)] = ["Parola este obligatorie."]
            }));

        var email = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken))
            return Conflict(new { message = "Emailul exista deja." });

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            AccessibilityProfile = request.AccessibilityProfile,
            AvatarUrl = request.AvatarUrl
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, UserResponse.From(user));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserResponse>> Update(int id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        if (!TryValidateAccount(request.Name, request.Email, out var validationProblem))
            return validationProblem;

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        var currentAdministratorId = GetCurrentAdministratorId();
        if (currentAdministratorId == id && request.Role != user.Role)
            return Conflict(new { message = "Nu iti poti schimba propriul rol din administrarea conturilor." });

        if (user.Role == UserRole.Administrator && request.Role != UserRole.Administrator &&
            await IsLastAdministrator(id, cancellationToken))
            return Conflict(new { message = "Trebuie sa ramana cel putin un administrator in platforma." });

        var email = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(item => item.Id != id && item.Email == email, cancellationToken))
            return Conflict(new { message = "Emailul exista deja." });

        user.Name = request.Name.Trim();
        user.Email = email;
        user.Role = request.Role;
        user.AccessibilityProfile = request.AccessibilityProfile;
        user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(UserResponse.From(user));
    }

    [HttpPut("{id:int}/password")]
    public async Task<IActionResult> ResetPassword(int id, ResetUserPasswordRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.NewPassword)] = ["Parola este obligatorie."]
            }));

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        if (GetCurrentAdministratorId() == id)
            return Conflict(new { message = "Nu iti poti sterge propriul cont din administrarea conturilor." });

        if (user.Role == UserRole.Administrator && await IsLastAdministrator(id, cancellationToken))
            return Conflict(new { message = "Trebuie sa ramana cel putin un administrator in platforma." });

        if (await dbContext.Reports.AnyAsync(report => report.UserId == id, cancellationToken))
            return Conflict(new
            {
                message = "Contul nu poate fi sters deoarece are rapoarte. Pastreaza-l pentru istoricul contributiilor."
            });

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private int? GetCurrentAdministratorId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task<bool> IsLastAdministrator(int administratorId, CancellationToken cancellationToken) =>
        !await dbContext.Users.AnyAsync(user => user.Id != administratorId && user.Role == UserRole.Administrator,
            cancellationToken);

    private bool TryValidateAccount(string name, string email, out ActionResult<UserResponse> validationProblem)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name))
            errors[nameof(CreateUserRequest.Name)] = ["Numele este obligatoriu."];
        if (string.IsNullOrWhiteSpace(email))
            errors[nameof(CreateUserRequest.Email)] = ["Emailul este obligatoriu."];

        validationProblem = errors.Count == 0
            ? null!
            : ValidationProblem(new ValidationProblemDetails(errors));
        return errors.Count == 0;
    }
}

public class CreateUserRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;
    public AccessibilityProfile AccessibilityProfile { get; set; } = AccessibilityProfile.Wheelchair;

    [Url, StringLength(2048)]
    public string? AvatarUrl { get; set; }
}

public class UpdateUserRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;
    public AccessibilityProfile AccessibilityProfile { get; set; } = AccessibilityProfile.Wheelchair;

    [Url, StringLength(2048)]
    public string? AvatarUrl { get; set; }
}

public class ResetUserPasswordRequest
{
    [Required, StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}

public record UserResponse(
    int Id,
    string Name,
    string Email,
    UserRole Role,
    AccessibilityProfile AccessibilityProfile,
    string? AvatarUrl,
    DateTimeOffset CreatedAt)
{
    public static UserResponse From(User user) => new(
        user.Id,
        user.Name,
        user.Email,
        user.Role,
        user.AccessibilityProfile,
        user.AvatarUrl,
        user.CreatedAt);
}
