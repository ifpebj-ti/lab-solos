using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class AddEmprestimoTabela : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Lotes",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Lotes",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NomeCompleto = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    SenhaHash = table.Column<string>(type: "TEXT", nullable: false),
                    Telefone = table.Column<string>(type: "TEXT", nullable: true),
                    DataIngresso = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TipoUsuario = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Instituição = table.Column<string>(type: "TEXT", nullable: true),
                    Cidade = table.Column<string>(type: "TEXT", nullable: true),
                    Curso = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Emprestimos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataRealizacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DataDevolucao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ProdutoId = table.Column<int>(type: "INTEGER", nullable: false),
                    SolicitanteId = table.Column<int>(type: "INTEGER", nullable: false),
                    AprovadorId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Emprestimos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Emprestimos_Produtos_ProdutoId",
                        column: x => x.ProdutoId,
                        principalTable: "Produtos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Emprestimos_Usuarios_AprovadorId",
                        column: x => x.AprovadorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Emprestimos_Usuarios_SolicitanteId",
                        column: x => x.SolicitanteId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Emprestimos_AprovadorId",
                table: "Emprestimos",
                column: "AprovadorId");

            migrationBuilder.CreateIndex(
                name: "IX_Emprestimos_ProdutoId",
                table: "Emprestimos",
                column: "ProdutoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Emprestimos_SolicitanteId",
                table: "Emprestimos",
                column: "SolicitanteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Emprestimos");

            migrationBuilder.DropTable(
                name: "Usuarios");

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
        }
    }
}
