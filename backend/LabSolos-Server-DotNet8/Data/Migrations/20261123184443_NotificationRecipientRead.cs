using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class NotificationRecipientRead : Migration
    {
        private static readonly string[] RecipientReadIndexColumns = ["UsuarioId", "Lida", "NotificacaoId"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AudienciaLegadaIndeterminada",
                table: "Notificacoes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "NotificacoesLeituras",
                columns: table => new
                {
                    NotificacaoId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Lida = table.Column<bool>(type: "boolean", nullable: false),
                    DataLeitura = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificacoesLeituras", x => new { x.NotificacaoId, x.UsuarioId });
                    table.CheckConstraint("CK_NotificacoesLeituras_UserId_Positive", "\"UsuarioId\" > 0");
                    table.ForeignKey(
                        name: "FK_NotificacoesLeituras_Notificacoes_NotificacaoId",
                        column: x => x.NotificacaoId,
                        principalTable: "Notificacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesLeituras_Usuario_Lida_Notificacao",
                table: "NotificacoesLeituras",
                columns: RecipientReadIndexColumns);

            migrationBuilder.Sql("""
                INSERT INTO "NotificacoesLeituras" ("NotificacaoId", "UsuarioId", "Lida", "DataLeitura")
                SELECT "Id", "UsuarioId", "Lida", "DataLeitura"
                FROM "Notificacoes"
                WHERE "UsuarioId" IS NOT NULL;

                UPDATE "Notificacoes"
                SET "AudienciaLegadaIndeterminada" = TRUE
                WHERE "UsuarioId" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificacoesLeituras");

            migrationBuilder.DropColumn(
                name: "AudienciaLegadaIndeterminada",
                table: "Notificacoes");
        }
    }
}
