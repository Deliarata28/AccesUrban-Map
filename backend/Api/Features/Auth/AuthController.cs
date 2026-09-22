using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AccesUrbanMap.Api.Endpoints;
using AccesUrbanMap.Api.Services;
using AccesUrbanMap.Domain;
using AccesUrbanMap.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AccesUrbanMap.Api.Features.Auth;

[ApiController]
[Route(ApiRoutes.Auth)]
public class AuthController(
    AccesUrbanMapDbContext dbContext,
    JwtTokenService jwtTokenService,
    IEmailSender emailSender) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken))
            return Conflict(new { message = "Există deja un cont cu acest email." });

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.User,
            AccessibilityProfile = request.AccessibilityProfile
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, jwtTokenService.Create(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthVerificationResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Emailul sau parola sunt incorecte." });

        var now = DateTimeOffset.UtcNow;
        var activeChallenges = await dbContext.AuthVerificationCodes
            .Where(challenge => challenge.UserId == user.Id && challenge.ConsumedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var activeChallenge in activeChallenges)
            activeChallenge.ConsumedAt = now;

        var verificationToken = CreateSecureToken();
        var code = RandomNumberGenerator.GetInt32(100_000, 1_000_000).ToString();
        var challenge = new AuthVerificationCode
        {
            UserId = user.Id,
            ChallengeHash = Hash(verificationToken),
            CodeHash = Hash(verificationToken + ":" + code),
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(1),
        };
        dbContext.AuthVerificationCodes.Add(challenge);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await emailSender.SendAsync(
                user.Email,
                "Confirmă conectarea · AccesUrban Map",
                LoginEmailTemplate.Create(user.Name, code),
                isHtml: true,
                includeBrandLogo: true,
                cancellationToken: cancellationToken);
        }
        catch
        {
            challenge.ConsumedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            throw;
        }

        return Ok(new AuthVerificationResponse(
            verificationToken,
            MaskEmail(user.Email),
            challenge.ExpiresAt));
    }

    [AllowAnonymous]
    [HttpPost("login/verify")]
    public async Task<ActionResult<AuthResponse>> VerifyLoginCode(
        VerifyLoginCodeRequest request,
        CancellationToken cancellationToken)
    {
        var challenge = await dbContext.AuthVerificationCodes
            .Include(item => item.User)
            .FirstOrDefaultAsync(
                item => item.ChallengeHash == Hash(request.VerificationToken),
                cancellationToken);

        if (challenge is null || challenge.ConsumedAt is not null)
            return Unauthorized(new { message = "Sesiunea de conectare nu mai este valabilă.", code = "AUTH_VERIFICATION_INVALID" });

        if (challenge.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            challenge.ConsumedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Codul a expirat. Cere un cod nou.", code = "LOGIN_CODE_EXPIRED" });
        }

        if (challenge.FailedAttempts >= 5)
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "Ai încercat de prea multe ori. Cere un cod nou.", code = "LOGIN_CODE_LOCKED" });

        var expectedHash = Convert.FromHexString(challenge.CodeHash);
        var actualHash = Convert.FromHexString(Hash(request.VerificationToken + ":" + request.Code.Trim()));
        if (!CryptographicOperations.FixedTimeEquals(expectedHash, actualHash))
        {
            challenge.FailedAttempts += 1;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Codul introdus nu este corect.", code = "LOGIN_CODE_INVALID" });
        }

        challenge.ConsumedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(jwtTokenService.Create(challenge.User));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken cancellationToken)
    {
        var idText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idText, out var userId))
            return Unauthorized();

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null)
            return Unauthorized();

        return Ok(CurrentUserResponse.From(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<CurrentUserResponse>> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var idText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idText, out var userId))
            return Unauthorized();

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null)
            return Unauthorized();

        user.Name = request.Name.Trim();
        user.AccessibilityProfile = request.AccessibilityProfile;
        user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(CurrentUserResponse.From(user));
    }

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var idText = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idText, out var userId))
            return Unauthorized();

        var user = await dbContext.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null)
            return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Parola curentă este incorectă." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string CreateSecureToken() =>
        Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@', 2);
        if (parts.Length != 2) return email;
        var visible = parts[0].Length <= 2 ? parts[0][0].ToString() : parts[0][..2];
        return visible + "***@" + parts[1];
    }
}

public class RegisterRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;

    public AccessibilityProfile AccessibilityProfile { get; set; } = AccessibilityProfile.Wheelchair;
}

public class LoginRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public class VerifyLoginCodeRequest
{
    [Required, StringLength(128, MinimumLength = 32)]
    public string VerificationToken { get; set; } = string.Empty;

    [Required, RegularExpression("^[0-9]{6}$")]
    public string Code { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required, StringLength(100, MinimumLength = 8)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public AccessibilityProfile AccessibilityProfile { get; set; } = AccessibilityProfile.Wheelchair;

    [Url, StringLength(2048)]
    public string? AvatarUrl { get; set; }
}

public record AuthResponse(
    int Id,
    string Name,
    string Email,
    UserRole Role,
    AccessibilityProfile AccessibilityProfile,
    string? AvatarUrl,
    DateTimeOffset CreatedAt,
    string Token,
    DateTimeOffset ExpiresAt);

public record AuthVerificationResponse(
    string VerificationToken,
    string Email,
    DateTimeOffset ExpiresAt);

public record CurrentUserResponse(
    int Id,
    string Name,
    string Email,
    UserRole Role,
    AccessibilityProfile AccessibilityProfile,
    string? AvatarUrl,
    DateTimeOffset CreatedAt)
{
    public static CurrentUserResponse From(User user) => new(
        user.Id,
        user.Name,
        user.Email,
        user.Role,
        user.AccessibilityProfile,
        user.AvatarUrl,
        user.CreatedAt);
}

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int ExpirationHours { get; set; } = 24;
}

public class JwtTokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public AuthResponse Create(User user)
    {
        if (Encoding.UTF8.GetByteCount(_options.Key) < 32)
            throw new InvalidOperationException("Jwt:Key trebuie să conțină cel puțin 32 de caractere.");

        var expiresAt = DateTimeOffset.UtcNow.AddHours(_options.ExpirationHours);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        var tokenValue = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResponse(
            user.Id,
            user.Name,
            user.Email,
            user.Role,
            user.AccessibilityProfile,
            user.AvatarUrl,
            user.CreatedAt,
            tokenValue,
            expiresAt);
    }
}
