using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations;

public partial class CleanupTechnicalPersistence : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "database_seed_states");

        migrationBuilder.RenameTable(
            name: "login_challenges",
            newName: "auth_verification_codes");

        migrationBuilder.Sql("ALTER TABLE auth_verification_codes RENAME CONSTRAINT \"PK_login_challenges\" TO \"PK_auth_verification_codes\";");
        migrationBuilder.Sql("ALTER TABLE auth_verification_codes RENAME CONSTRAINT \"FK_login_challenges_users_UserId\" TO \"FK_auth_verification_codes_users_UserId\";");
        migrationBuilder.Sql("ALTER INDEX \"IX_login_challenges_challenge_hash\" RENAME TO \"IX_auth_verification_codes_challenge_hash\";");
        migrationBuilder.Sql("ALTER INDEX \"IX_login_challenges_UserId_expires_at\" RENAME TO \"IX_auth_verification_codes_UserId_expires_at\";");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER INDEX \"IX_auth_verification_codes_challenge_hash\" RENAME TO \"IX_login_challenges_challenge_hash\";");
        migrationBuilder.Sql("ALTER INDEX \"IX_auth_verification_codes_UserId_expires_at\" RENAME TO \"IX_login_challenges_UserId_expires_at\";");
        migrationBuilder.Sql("ALTER TABLE auth_verification_codes RENAME CONSTRAINT \"FK_auth_verification_codes_users_UserId\" TO \"FK_login_challenges_users_UserId\";");
        migrationBuilder.Sql("ALTER TABLE auth_verification_codes RENAME CONSTRAINT \"PK_auth_verification_codes\" TO \"PK_login_challenges\";");
        migrationBuilder.RenameTable(
            name: "auth_verification_codes",
            newName: "login_challenges");

        migrationBuilder.CreateTable(
            name: "database_seed_states",
            columns: table => new
            {
                key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                applied_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_database_seed_states", x => x.key));
    }
}
