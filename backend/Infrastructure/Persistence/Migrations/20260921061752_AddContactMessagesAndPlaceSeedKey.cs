using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContactMessagesAndPlaceSeedKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "seed_key",
                table: "places",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "contact_messages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    last_reply = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    read_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    replied_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    replied_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_contact_messages_users_replied_by_user_id",
                        column: x => x.replied_by_user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_places_seed_key",
                table: "places",
                column: "seed_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contact_messages_replied_by_user_id",
                table: "contact_messages",
                column: "replied_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_messages_status",
                table: "contact_messages",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contact_messages");

            migrationBuilder.DropIndex(
                name: "IX_places_seed_key",
                table: "places");

            migrationBuilder.DropColumn(
                name: "seed_key",
                table: "places");
        }
    }
}
