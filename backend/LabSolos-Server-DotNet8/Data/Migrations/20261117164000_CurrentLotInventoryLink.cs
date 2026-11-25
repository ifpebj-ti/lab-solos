using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations;

public partial class CurrentLotInventoryLink : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // No legacy correction is performed. Invalid/duplicate existing codes must be
        // reviewed operationally before this additive constraint can be applied.
        migrationBuilder.AddColumn<string>(
            name: "CodigoNormalizado", table: "Lotes", type: "text", nullable: true,
            computedColumnSql: "lower(btrim(\"CodigoLote\"))", stored: true);
        migrationBuilder.AddCheckConstraint(
            name: "CK_Lotes_Codigo_NotBlank", table: "Lotes",
            sql: "length(btrim(\"CodigoLote\")) > 0");
        migrationBuilder.CreateIndex(
            name: "UX_Lotes_CodigoNormalizado", table: "Lotes",
            column: "CodigoNormalizado", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "UX_Lotes_CodigoNormalizado", table: "Lotes");
        migrationBuilder.DropCheckConstraint(name: "CK_Lotes_Codigo_NotBlank", table: "Lotes");
        migrationBuilder.DropColumn(name: "CodigoNormalizado", table: "Lotes");
    }
}
