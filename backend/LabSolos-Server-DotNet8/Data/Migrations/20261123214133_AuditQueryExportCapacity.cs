using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuditQueryExportCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "AuthenticationProtectionCapacity",
                columns: new[] { "Scope", "Allocated" },
                values: new object[,]
                {
                    { "audit:export:administrator", 0 },
                    { "audit:query:administrator", 0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "audit:export:administrator");

            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "audit:query:administrator");
        }
    }
}
