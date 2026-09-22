using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoginChallenges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "login_challenges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    challenge_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    code_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    consumed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    failed_attempts = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_login_challenges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_login_challenges_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_login_challenges_challenge_hash",
                table: "login_challenges",
                column: "challenge_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_login_challenges_UserId_expires_at",
                table: "login_challenges",
                columns: new[] { "UserId", "expires_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "login_challenges");
        }
    }
}
