using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class InitialCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Lotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CodigoLote = table.Column<string>(type: "TEXT", nullable: false),
                    DataEntrada = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Produtos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NomeProduto = table.Column<string>(type: "TEXT", nullable: false),
                    Fornecedor = table.Column<string>(type: "TEXT", nullable: true),
                    Tipo = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantidade = table.Column<double>(type: "REAL", nullable: false),
                    QuantidadeMinima = table.Column<double>(type: "REAL", nullable: false),
                    DataFabricacao = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DataValidade = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LocalizacaoProduto = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    UltimaModificacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LoteId = table.Column<int>(type: "INTEGER", nullable: true),
                    Catmat = table.Column<string>(type: "TEXT", nullable: true),
                    UnidadeMedida = table.Column<int>(type: "INTEGER", nullable: true),
                    EstadoFisico = table.Column<int>(type: "INTEGER", nullable: true),
                    Cor = table.Column<int>(type: "INTEGER", nullable: true),
                    Odor = table.Column<int>(type: "INTEGER", nullable: true),
                    Densidade = table.Column<float>(type: "REAL", nullable: true),
                    PesoMolecular = table.Column<float>(type: "REAL", nullable: true),
                    GrauPureza = table.Column<string>(type: "TEXT", nullable: true),
                    FormulaQuimica = table.Column<string>(type: "TEXT", nullable: true),
                    Grupo = table.Column<int>(type: "INTEGER", nullable: true),
                    Material = table.Column<int>(type: "INTEGER", nullable: true),
                    Formato = table.Column<int>(type: "INTEGER", nullable: true),
                    Altura = table.Column<int>(type: "INTEGER", nullable: true),
                    Capacidade = table.Column<double>(type: "REAL", nullable: true),
                    Graduada = table.Column<bool>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Produtos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Produtos_Lotes_LoteId",
                        column: x => x.LoteId,
                        principalTable: "Lotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "Lotes",
                columns: new[] { "Id", "CodigoLote", "DataEntrada" },
                values: new object[,]
                {
                    { 1, "LQ001", new DateTime(2024, 9, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9573) },
                    { 2, "LV001", new DateTime(2024, 8, 15, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9613) }
                });

            migrationBuilder.InsertData(
                table: "Produtos",
                columns: new[] { "Id", "Catmat", "Cor", "DataFabricacao", "DataValidade", "Densidade", "EstadoFisico", "FormulaQuimica", "Fornecedor", "GrauPureza", "Grupo", "LocalizacaoProduto", "LoteId", "NomeProduto", "Odor", "PesoMolecular", "Quantidade", "QuantidadeMinima", "Status", "Tipo", "UltimaModificacao", "UnidadeMedida" },
                values: new object[,]
                {
                    { 1, "Q1234", 0, null, new DateTime(2025, 10, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9619), 1.84f, 1, "H2SO4", null, "98%", 0, "Prateleira A", 1, "Ácido Sulfúrico", 1, 98.079f, 200.0, 50.0, 0, 0, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 1 },
                    { 2, "Q5678", 1, null, new DateTime(2026, 10, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9634), 2.16f, 0, "NaCl", null, "P.A.", 3, "Prateleira B", 1, "Cloreto de Sódio", 0, 58.44f, 300.0, 30.0, 0, 0, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 3 }
                });

            migrationBuilder.InsertData(
                table: "Produtos",
                columns: new[] { "Id", "Altura", "Capacidade", "DataFabricacao", "DataValidade", "Formato", "Fornecedor", "Graduada", "LocalizacaoProduto", "LoteId", "Material", "NomeProduto", "Quantidade", "QuantidadeMinima", "Status", "Tipo", "UltimaModificacao" },
                values: new object[,]
                {
                    { 3, 0, 500.0, null, null, 0, null, true, "Armário Vidraria", 2, 0, "Béquer Borossilicato 500ml", 50.0, 10.0, 0, 1, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified) },
                    { 4, 2, 1000.0, null, null, 1, null, false, "Armário Vidraria", 2, 3, "Recipiente Polipropileno 1L", 30.0, 5.0, 0, 1, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Produtos_LoteId",
                table: "Produtos",
                column: "LoteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Produtos");

            migrationBuilder.DropTable(
                name: "Lotes");
        }
    }
}
