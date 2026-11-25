using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class LoanReturnAuditUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "UX_LogsAuditoria_DevolucaoEmprestimo_Recurso",
                table: "LogsAuditoria",
                column: "Recurso",
                unique: true,
                filter: "\"CodigoEvento\" = 'DevolucaoEmprestimo' AND \"CategoriaRegistro\" = 'TrilhaObrigatoria'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_LogsAuditoria_DevolucaoEmprestimo_Recurso",
                table: "LogsAuditoria");
        }
    }
}
