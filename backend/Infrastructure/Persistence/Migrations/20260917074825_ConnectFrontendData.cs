using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace AccesUrbanMap.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConnectFrontendData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reports_places_place_id",
                table: "reports");

            migrationBuilder.AddColumn<string>(
                name: "accessibility_profile",
                table: "users",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Wheelchair");

            migrationBuilder.AddColumn<string>(
                name: "avatar_url",
                table: "users",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "place_id",
                table: "reports",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<Point>(
                name: "geometry",
                table: "reports",
                type: "geometry(Point,4326)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "latitude",
                table: "reports",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location_name",
                table: "reports",
                type: "character varying(240)",
                maxLength: 240,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.AddColumn<decimal>(
                name: "longitude",
                table: "reports",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "moderator_note",
                table: "reports",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "reviewed_by_user_id",
                table: "reports",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_verified",
                table: "places",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "places",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<bool>(
                name: "wheelchair_access",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "tactile_paving",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "step_free_entry",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "audio_signal",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "accessible_toilet",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "accessible_parking",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "Ramp",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "Elevator",
                table: "accessibility_features",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.CreateIndex(
                name: "IX_reports_reviewed_by_user_id",
                table: "reports",
                column: "reviewed_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_reports_places_place_id",
                table: "reports",
                column: "place_id",
                principalTable: "places",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_reports_users_reviewed_by_user_id",
                table: "reports",
                column: "reviewed_by_user_id",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reports_places_place_id",
                table: "reports");

            migrationBuilder.DropForeignKey(
                name: "FK_reports_users_reviewed_by_user_id",
                table: "reports");

            migrationBuilder.DropIndex(
                name: "IX_reports_reviewed_by_user_id",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "accessibility_profile",
                table: "users");

            migrationBuilder.DropColumn(
                name: "avatar_url",
                table: "users");

            migrationBuilder.DropColumn(
                name: "geometry",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "latitude",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "location_name",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "longitude",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "moderator_note",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "reviewed_by_user_id",
                table: "reports");

            migrationBuilder.DropColumn(
                name: "is_verified",
                table: "places");

            migrationBuilder.DropColumn(
                name: "source",
                table: "places");

            migrationBuilder.AlterColumn<int>(
                name: "place_id",
                table: "reports",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "wheelchair_access",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "tactile_paving",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "step_free_entry",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "audio_signal",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "accessible_toilet",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "accessible_parking",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "Ramp",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "Elevator",
                table: "accessibility_features",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_reports_places_place_id",
                table: "reports",
                column: "place_id",
                principalTable: "places",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
