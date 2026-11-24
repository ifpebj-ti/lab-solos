using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuditClassificationRevision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RevisaoClassificacao",
                table: "LogsAuditoria",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AuditClassificationRevisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LogAuditoriaId = table.Column<int>(type: "integer", nullable: false),
                    NumeroRevisao = table.Column<int>(type: "integer", nullable: false),
                    SuspeitaAnterior = table.Column<bool>(type: "boolean", nullable: false),
                    SuspeitaResultante = table.Column<bool>(type: "boolean", nullable: false),
                    Justificativa = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CriadaEmUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AutorUsuarioId = table.Column<int>(type: "integer", nullable: true),
                    Origem = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditClassificationRevisions", x => x.Id);
                    table.CheckConstraint("CK_AuditClassificationRevisions_Origin_Actor", "(\"Origem\" = 'LegadoObservado' AND \"AutorUsuarioId\" IS NULL) OR (\"Origem\" = 'RevisaoManual' AND \"AutorUsuarioId\" > 0)");
                    table.CheckConstraint("CK_AuditClassificationRevisions_Revision_NonNegative", "\"NumeroRevisao\" >= 0");
                    table.ForeignKey(
                        name: "FK_AuditClassificationRevisions_LogsAuditoria_LogAuditoriaId",
                        column: x => x.LogAuditoriaId,
                        principalTable: "LogsAuditoria",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UX_AuditClassificationRevisions_Log_Revision",
                table: "AuditClassificationRevisions",
                columns: new[] { "LogAuditoriaId", "NumeroRevisao" },
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO "AuditClassificationRevisions"
                    ("LogAuditoriaId", "NumeroRevisao", "SuspeitaAnterior", "SuspeitaResultante",
                     "Justificativa", "CriadaEmUtc", "AutorUsuarioId", "Origem")
                SELECT log."Id", 0, log."Suspeita", log."Suspeita",
                       COALESCE(
                           NULLIF(btrim(log."MotivoSuspeita"), ''),
                           'Classificação observada na migração; autoria e histórico anteriores não disponíveis.'),
                       log."DataHora", NULL, 'LegadoObservado'
                FROM "LogsAuditoria" AS log
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditClassificationRevisions");

            migrationBuilder.DropColumn(
                name: "RevisaoClassificacao",
                table: "LogsAuditoria");
        }
    }
}
