using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations;

/// <summary>
/// Keeps the existing catalog and user content while simplifying the schema.
/// Accessibility belongs to the place row and coordinates are plain decimals.
/// </summary>
public partial class FlattenPlacesAndRemovePostgis : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "wheelchair_access",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "ramp",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "step_free_entry",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "elevator",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "accessible_toilet",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "accessible_parking",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "tactile_paving",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "audio_signal",
            table: "places",
            type: "boolean",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "accessibility_score",
            table: "places",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "accessibility_updated_at",
            table: "places",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP");

        // Old migrations used quoted PascalCase names for three columns.
        // Copy them before removing the one-to-one table.
        migrationBuilder.Sql(@"
            UPDATE places AS p
            SET wheelchair_access = a.wheelchair_access,
                ramp = a.""Ramp"",
                step_free_entry = a.step_free_entry,
                elevator = a.""Elevator"",
                accessible_toilet = a.accessible_toilet,
                accessible_parking = a.accessible_parking,
                tactile_paving = a.tactile_paving,
                audio_signal = a.audio_signal,
                accessibility_score = a.""Score"",
                accessibility_updated_at = a.updated_at
            FROM accessibility_features AS a
            WHERE a.place_id = p.""Id"";");

        migrationBuilder.DropColumn(
            name: "geometry",
            table: "places");

        migrationBuilder.DropColumn(
            name: "geometry",
            table: "reports");

        migrationBuilder.DropTable(
            name: "accessibility_features");

        // Removes spatial_ref_sys and the PostGIS metadata from the final schema.
        migrationBuilder.Sql("DROP EXTENSION IF EXISTS postgis CASCADE;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS postgis;");

        migrationBuilder.AddColumn<string>(
            name: "geometry",
            table: "places",
            type: "geometry(Point,4326)",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "geometry",
            table: "reports",
            type: "geometry(Point,4326)",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "accessibility_features",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                place_id = table.Column<int>(type: "integer", nullable: false),
                wheelchair_access = table.Column<bool>(type: "boolean", nullable: false),
                Ramp = table.Column<bool>(type: "boolean", nullable: false),
                step_free_entry = table.Column<bool>(type: "boolean", nullable: false),
                Elevator = table.Column<bool>(type: "boolean", nullable: false),
                accessible_toilet = table.Column<bool>(type: "boolean", nullable: false),
                accessible_parking = table.Column<bool>(type: "boolean", nullable: false),
                tactile_paving = table.Column<bool>(type: "boolean", nullable: false),
                audio_signal = table.Column<bool>(type: "boolean", nullable: false),
                Score = table.Column<int>(type: "integer", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_accessibility_features", x => x.Id);
                table.ForeignKey(
                    name: "FK_accessibility_features_places_place_id",
                    column: x => x.place_id,
                    principalTable: "places",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.Sql(@"
            INSERT INTO accessibility_features
                (place_id, wheelchair_access, ""Ramp"", step_free_entry, ""Elevator"",
                 accessible_toilet, accessible_parking, tactile_paving, audio_signal, ""Score"", updated_at)
            SELECT ""Id"", COALESCE(wheelchair_access, false), COALESCE(ramp, false),
                   COALESCE(step_free_entry, false), COALESCE(elevator, false),
                   COALESCE(accessible_toilet, false), COALESCE(accessible_parking, false),
                   COALESCE(tactile_paving, false), COALESCE(audio_signal, false),
                   accessibility_score, accessibility_updated_at
            FROM places;");

        migrationBuilder.DropColumn(name: "wheelchair_access", table: "places");
        migrationBuilder.DropColumn(name: "ramp", table: "places");
        migrationBuilder.DropColumn(name: "step_free_entry", table: "places");
        migrationBuilder.DropColumn(name: "elevator", table: "places");
        migrationBuilder.DropColumn(name: "accessible_toilet", table: "places");
        migrationBuilder.DropColumn(name: "accessible_parking", table: "places");
        migrationBuilder.DropColumn(name: "tactile_paving", table: "places");
        migrationBuilder.DropColumn(name: "audio_signal", table: "places");
        migrationBuilder.DropColumn(name: "accessibility_score", table: "places");
        migrationBuilder.DropColumn(name: "accessibility_updated_at", table: "places");
    }
}
