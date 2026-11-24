using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuditDetectionRuleProvenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoriaDeteccao",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "AtividadeNormal");

            migrationBuilder.AddColumn<string>(
                name: "CodigoRegraDeteccao",
                table: "LogsAuditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuantidadeObservadaDeteccao",
                table: "LogsAuditoria",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VersaoRegraDeteccao",
                table: "LogsAuditoria",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "LogsAuditoria"
                SET "CategoriaDeteccao" = CASE
                    WHEN "Suspeita" THEN 'AtividadeSuspeita'
                    WHEN "OrigemConfiavel" = 'SemAtorValido' THEN 'SemAtorValido'
                    ELSE 'AtividadeNormal'
                END
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_LogsAuditoria_DetectionRuleMetadata",
                table: "LogsAuditoria",
                sql: "(\"CodigoRegraDeteccao\" IS NULL AND \"VersaoRegraDeteccao\" IS NULL AND \"QuantidadeObservadaDeteccao\" IS NULL) OR (\"CodigoRegraDeteccao\" IS NOT NULL AND length(btrim(\"CodigoRegraDeteccao\")) > 0 AND \"VersaoRegraDeteccao\" > 0 AND \"QuantidadeObservadaDeteccao\" > 0 AND \"CategoriaDeteccao\" = 'AtividadeSuspeita')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_LogsAuditoria_DetectionRuleMetadata",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "CategoriaDeteccao",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "CodigoRegraDeteccao",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "QuantidadeObservadaDeteccao",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "VersaoRegraDeteccao",
                table: "LogsAuditoria");
        }
    }
}
