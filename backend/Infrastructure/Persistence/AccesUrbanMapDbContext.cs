using AccesUrbanMap.Domain;
using Microsoft.EntityFrameworkCore;

namespace AccesUrbanMap.Infrastructure.Persistence;

public class AccesUrbanMapDbContext(DbContextOptions<AccesUrbanMapDbContext> options) : DbContext(options)
{
    public DbSet<Place> Places => Set<Place>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<User> Users => Set<User>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<AuthVerificationCode> AuthVerificationCodes => Set<AuthVerificationCode>();
    public DbSet<ErrorLog> ErrorLogs => Set<ErrorLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.Entity<Place>(entity =>
        {
            entity.ToTable("places");
            entity.HasKey(place => place.Id);
            entity.Property(place => place.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(place => place.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
            entity.Property(place => place.Category).HasColumnName("category").HasMaxLength(100).IsRequired();
            entity.Property(place => place.Address).HasColumnName("address").HasMaxLength(240).IsRequired();
            entity.Property(place => place.Latitude).HasColumnName("latitude").HasPrecision(9, 6);
            entity.Property(place => place.Longitude).HasColumnName("longitude").HasPrecision(9, 6);
            entity.Property(place => place.Geometry)
                .HasColumnName("geometry")
                .HasColumnType("geometry(Point,4326)")
                .IsRequired();
            entity.Property(place => place.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(32);
            entity.Property(place => place.IsVerified).HasColumnName("is_verified");
            entity.Property(place => place.SeedKey).HasColumnName("seed_key").HasMaxLength(80);
            entity.Property(place => place.CreatedAt).HasColumnName("created_at");
            entity.Property(place => place.UpdatedAt).HasColumnName("updated_at");
            entity.Property(place => place.WheelchairAccess).HasColumnName("wheelchair_access");
            entity.Property(place => place.Ramp).HasColumnName("ramp");
            entity.Property(place => place.StepFreeEntry).HasColumnName("step_free_entry");
            entity.Property(place => place.Elevator).HasColumnName("elevator");
            entity.Property(place => place.AccessibleToilet).HasColumnName("accessible_toilet");
            entity.Property(place => place.AccessibleParking).HasColumnName("accessible_parking");
            entity.Property(place => place.TactilePaving).HasColumnName("tactile_paving");
            entity.Property(place => place.AudioSignal).HasColumnName("audio_signal");
            entity.Property(place => place.AccessibilityScore).HasColumnName("accessibility_score");
            entity.Property(place => place.AccessibilityUpdatedAt).HasColumnName("accessibility_updated_at");
            entity.HasIndex(place => place.Category);
            entity.HasIndex(place => place.SeedKey).IsUnique();
            entity.HasIndex(place => place.Geometry).HasMethod("GIST");
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.ToTable("reports");
            entity.HasKey(report => report.Id);
            entity.Property(report => report.PlaceId).HasColumnName("place_id");
            entity.Property(report => report.LocationName).HasColumnName("location_name").HasMaxLength(240).IsRequired();
            entity.Property(report => report.Latitude).HasColumnName("latitude").HasPrecision(9, 6);
            entity.Property(report => report.Longitude).HasColumnName("longitude").HasPrecision(9, 6);
            entity.Property(report => report.Geometry)
                .HasColumnName("geometry")
                .HasColumnType("geometry(Point,4326)");
            entity.Property(report => report.UserId).HasColumnName("user_id");
            entity.Property(report => report.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
            entity.Property(report => report.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(32);
            entity.Property(report => report.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
            entity.Property(report => report.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16);
            entity.Property(report => report.ModeratorNote).HasColumnName("moderator_note").HasMaxLength(1000);
            entity.Property(report => report.CreatedAt).HasColumnName("created_at");
            entity.Property(report => report.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(report => report.Place).WithMany(place => place.Reports).HasForeignKey(report => report.PlaceId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(report => report.User).WithMany(user => user.Reports).HasForeignKey(report => report.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(report => report.ReviewedByUser).WithMany(user => user.ReviewedReports)
                .HasForeignKey(report => report.ReviewedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Photo>(entity =>
        {
            entity.ToTable("photos");
            entity.HasKey(photo => photo.Id);
            entity.Property(photo => photo.PlaceId).HasColumnName("place_id");
            entity.Property(photo => photo.ReportId).HasColumnName("report_id");
            entity.Property(photo => photo.Url).HasColumnName("url").HasMaxLength(2048).IsRequired();
            entity.Property(photo => photo.CreatedAt).HasColumnName("created_at");
            entity.HasOne(photo => photo.Place).WithMany(place => place.Photos).HasForeignKey(photo => photo.PlaceId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(photo => photo.Report).WithMany(report => report.Photos).HasForeignKey(photo => photo.ReportId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(user => user.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            entity.Property(user => user.PasswordHash).HasColumnName("password_hash").HasMaxLength(512).IsRequired();
            entity.Property(user => user.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(20);
            entity.Property(user => user.AccessibilityProfile).HasColumnName("accessibility_profile").HasConversion<string>().HasMaxLength(32);
            entity.Property(user => user.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(2048);
            entity.Property(user => user.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(user => user.Email).IsUnique();
        });

        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.ToTable("contact_messages");
            entity.HasKey(message => message.Id);
            entity.Property(message => message.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(message => message.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            entity.Property(message => message.Subject).HasColumnName("subject").HasMaxLength(200).IsRequired();
            entity.Property(message => message.Message).HasColumnName("message").HasMaxLength(4000).IsRequired();
            entity.Property(message => message.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16).IsRequired();
            entity.Property(message => message.LastReply).HasColumnName("last_reply").HasMaxLength(4000);
            entity.Property(message => message.CreatedAt).HasColumnName("created_at");
            entity.Property(message => message.ReadAt).HasColumnName("read_at");
            entity.Property(message => message.RepliedAt).HasColumnName("replied_at");
            entity.Property(message => message.RepliedByUserId).HasColumnName("replied_by_user_id");
            entity.HasIndex(message => message.Status);
            entity.HasOne(message => message.RepliedByUser).WithMany()
                .HasForeignKey(message => message.RepliedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AuthVerificationCode>(entity =>
        {
            entity.ToTable("auth_verification_codes");
            entity.HasKey(challenge => challenge.Id);
            entity.Property(challenge => challenge.ChallengeHash).HasColumnName("challenge_hash").HasMaxLength(128).IsRequired();
            entity.Property(challenge => challenge.CodeHash).HasColumnName("code_hash").HasMaxLength(128).IsRequired();
            entity.Property(challenge => challenge.CreatedAt).HasColumnName("created_at");
            entity.Property(challenge => challenge.ExpiresAt).HasColumnName("expires_at");
            entity.Property(challenge => challenge.ConsumedAt).HasColumnName("consumed_at");
            entity.Property(challenge => challenge.FailedAttempts).HasColumnName("failed_attempts");
            entity.HasIndex(challenge => challenge.ChallengeHash).IsUnique();
            entity.HasIndex(challenge => new { challenge.UserId, challenge.ExpiresAt });
            entity.HasOne(challenge => challenge.User).WithMany()
                .HasForeignKey(challenge => challenge.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ErrorLog>(entity =>
        {
            entity.ToTable("error_logs");
            entity.HasKey(log => log.Id);
            entity.Property(log => log.TraceId).HasColumnName("trace_id").HasMaxLength(128).IsRequired();
            entity.Property(log => log.UserId).HasColumnName("user_id");
            entity.Property(log => log.RequestMethod).HasColumnName("request_method").HasMaxLength(16).IsRequired();
            entity.Property(log => log.RequestPath).HasColumnName("request_path").HasMaxLength(2048).IsRequired();
            entity.Property(log => log.StatusCode).HasColumnName("status_code");
            entity.Property(log => log.ExceptionType).HasColumnName("exception_type").HasMaxLength(512).IsRequired();
            entity.Property(log => log.Message).HasColumnName("message").HasMaxLength(4000).IsRequired();
            entity.Property(log => log.StackTrace).HasColumnName("stack_trace");
            entity.Property(log => log.CreatedAt).HasColumnName("created_at");
            entity.Property(log => log.UserEmail).HasColumnName("user_email").HasMaxLength(320);
            entity.Property(log => log.UserName).HasColumnName("user_name").HasMaxLength(160);
            entity.HasIndex(log => log.TraceId);
            entity.HasIndex(log => log.CreatedAt);
        });

    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Modified)
                continue;

            if (entry.Entity is Place place)
            {
                place.UpdatedAt = now;
                place.AccessibilityUpdatedAt = now;
            }
            if (entry.Entity is Report report) report.UpdatedAt = now;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
