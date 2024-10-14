using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class SeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Produtos",
                columns: new[] { "Id", "Catmat", "Codigo", "DataValidade", "Formula", "Grupo", "LocalizacaoProduto", "Lote", "Marca", "Quantidade", "QuantidadeMinima", "Status", "Tipo", "UltimaModificacao", "UnidadeMedida" },
                values: new object[] { 1, "CATMAT-01", "Q123", new DateTime(2025, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4557), "H2O", 0, "Prateleira A", "Lote1", "Marca X", 100.0, 10.0, true, 0, new DateTime(2024, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4589), 0 });

            migrationBuilder.InsertData(
                table: "Produtos",
                columns: new[] { "Id", "Codigo", "DataValidade", "LocalizacaoProduto", "Lote", "Marca", "Quantidade", "QuantidadeMinima", "Status", "Tipo", "UltimaModificacao", "Volumetria" },
                values: new object[] { 2, "V456", new DateTime(2026, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4783), "Prateleira B", "Lote2", "Marca Y", 50.0, 5.0, true, 1, new DateTime(2024, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4791), 500.0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 2);
        }
    }
}
