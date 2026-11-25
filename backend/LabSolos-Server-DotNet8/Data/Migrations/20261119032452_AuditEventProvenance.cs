using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuditEventProvenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoriaRegistro",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CodigoEvento",
                table: "LogsAuditoria",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CorrelationId",
                table: "LogsAuditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiraEmUtc",
                table: "LogsAuditoria",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "OrigemConfiavel",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReferenciaAtor",
                table: "LogsAuditoria",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resultado",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE "LogsAuditoria"
                SET "CodigoEvento" = 'LegadoNaoClassificado',
                    "OrigemConfiavel" = CASE
                        WHEN "UsuarioId" IS NULL THEN 'SemAtorValido'
                        ELSE 'UsuarioAutenticado'
                    END,
                    "ReferenciaAtor" = CASE
                        WHEN "UsuarioId" IS NULL THEN NULL
                        ELSE 'usuario:' || "UsuarioId"::text
                    END,
                    "Resultado" = 'Indeterminado',
                    "CategoriaRegistro" = 'DiagnosticoOperacional',
                    "CorrelationId" = 'legacy-' || "Id"::text,
                    "ExpiraEmUtc" = "DataHora" + INTERVAL '30 days',
                    "DadosRequisicao" = NULL,
                    "DadosResposta" = NULL,
                    "UserAgent" = NULL,
                    "TempoSessao" = NULL,
                    "TentativasAcesso" = NULL
                """);

            migrationBuilder.AlterColumn<string>(
                name: "CategoriaRegistro",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "CodigoEvento",
                table: "LogsAuditoria",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "CorrelationId",
                table: "LogsAuditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "ExpiraEmUtc",
                table: "LogsAuditoria",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTimeOffset(
                    new DateTime(1, 1, 1, 0, 0, 0, DateTimeKind.Unspecified),
                    TimeSpan.Zero));

            migrationBuilder.AlterColumn<string>(
                name: "OrigemConfiavel",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Resultado",
                table: "LogsAuditoria",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldDefaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_ExpiraEmUtc",
                table: "LogsAuditoria",
                column: "ExpiraEmUtc");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LogsAuditoria_ActorProvenance",
                table: "LogsAuditoria",
                sql: "(\"OrigemConfiavel\" = 'UsuarioAutenticado' AND \"ReferenciaAtor\" LIKE 'usuario:%') OR (\"OrigemConfiavel\" = 'ProcessoAutorizado' AND \"ReferenciaAtor\" LIKE 'processo:%' AND \"UsuarioId\" IS NULL) OR (\"OrigemConfiavel\" = 'SemAtorValido' AND \"ReferenciaAtor\" IS NULL AND \"UsuarioId\" IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LogsAuditoria_Expiry",
                table: "LogsAuditoria",
                sql: "\"ExpiraEmUtc\" > \"DataHora\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LogsAuditoria_ExpiraEmUtc",
                table: "LogsAuditoria");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LogsAuditoria_ActorProvenance",
                table: "LogsAuditoria");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LogsAuditoria_Expiry",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "CategoriaRegistro",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "CodigoEvento",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "CorrelationId",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "ExpiraEmUtc",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "OrigemConfiavel",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "ReferenciaAtor",
                table: "LogsAuditoria");

            migrationBuilder.DropColumn(
                name: "Resultado",
                table: "LogsAuditoria");
        }
    }
}
