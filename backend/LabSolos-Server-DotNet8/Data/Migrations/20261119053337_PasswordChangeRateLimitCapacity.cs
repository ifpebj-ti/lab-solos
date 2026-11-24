using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class PasswordChangeRateLimitCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "AuthenticationProtectionCapacity",
                columns: new[] { "Scope", "Allocated" },
                values: new object[] { "password-change:account", 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "password-change:account");
        }
    }
}
