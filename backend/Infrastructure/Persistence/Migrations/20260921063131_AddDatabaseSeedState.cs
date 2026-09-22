using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDatabaseSeedState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "database_seed_states",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    applied_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_database_seed_states", x => x.key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "database_seed_states");
        }
    }
}
