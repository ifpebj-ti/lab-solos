using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class NotificationMutation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ChaveIdempotencia",
                table: "Notificacoes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExcluidaEmUtc",
                table: "Notificacoes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.InsertData(
                table: "AuthenticationProtectionCapacity",
                columns: new[] { "Scope", "Allocated" },
                values: new object[,]
                {
                    { "notification:automatic:service", 0 },
                    { "notification:manual:administrator", 0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_ChaveIdempotencia",
                table: "Notificacoes",
                column: "ChaveIdempotencia",
                unique: true,
                filter: "\"ChaveIdempotencia\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_ChaveIdempotencia",
                table: "Notificacoes");

            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "notification:automatic:service");

            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "notification:manual:administrator");

            migrationBuilder.DropColumn(
                name: "ChaveIdempotencia",
                table: "Notificacoes");

            migrationBuilder.DropColumn(
                name: "ExcluidaEmUtc",
                table: "Notificacoes");
        }
    }
}
