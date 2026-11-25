using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class OperationAdmissionCapacity : Migration
    {
        private static readonly string[] CapacityColumns = ["Scope", "Allocated"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "AuthenticationProtectionCapacity",
                columns: CapacityColumns,
                values: new object[,]
                {
                    { "public-registration:ip", 0 },
                    { "loan-creation:account", 0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "public-registration:ip");
            migrationBuilder.DeleteData(
                table: "AuthenticationProtectionCapacity",
                keyColumn: "Scope",
                keyValue: "loan-creation:account");
        }
    }
}
