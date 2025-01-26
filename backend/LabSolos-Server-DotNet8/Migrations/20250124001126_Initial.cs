using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
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
                    NivelUsuario = table.Column<int>(type: "INTEGER", nullable: false),
                    TipoUsuario = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ResponsavelId = table.Column<int>(type: "INTEGER", nullable: true),
                    Instituicao = table.Column<string>(type: "TEXT", nullable: true),
                    Cidade = table.Column<string>(type: "TEXT", nullable: true),
                    Curso = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Usuarios_Usuarios_ResponsavelId",
                        column: x => x.ResponsavelId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                    SolicitanteId = table.Column<int>(type: "INTEGER", nullable: false),
                    AprovadorId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Emprestimos", x => x.Id);
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

            migrationBuilder.CreateTable(
                name: "Produtos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NomeProduto = table.Column<string>(type: "TEXT", nullable: false),
                    Fornecedor = table.Column<string>(type: "TEXT", nullable: true),
                    Tipo = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantidade = table.Column<float>(type: "REAL", nullable: false),
                    QuantidadeMinima = table.Column<float>(type: "REAL", nullable: false),
                    DataFabricacao = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DataValidade = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LocalizacaoProduto = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    UltimaModificacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LoteId = table.Column<int>(type: "INTEGER", nullable: true),
                    EmprestimoId = table.Column<int>(type: "INTEGER", nullable: true),
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
                    Capacidade = table.Column<float>(type: "REAL", nullable: true),
                    Graduada = table.Column<bool>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Produtos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Produtos_Emprestimos_EmprestimoId",
                        column: x => x.EmprestimoId,
                        principalTable: "Emprestimos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Produtos_Lotes_LoteId",
                        column: x => x.LoteId,
                        principalTable: "Lotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Emprestimos_AprovadorId",
                table: "Emprestimos",
                column: "AprovadorId");

            migrationBuilder.CreateIndex(
                name: "IX_Emprestimos_SolicitanteId",
                table: "Emprestimos",
                column: "SolicitanteId");

            migrationBuilder.CreateIndex(
                name: "IX_Produtos_EmprestimoId",
                table: "Produtos",
                column: "EmprestimoId");

            migrationBuilder.CreateIndex(
                name: "IX_Produtos_LoteId",
                table: "Produtos",
                column: "LoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_ResponsavelId",
                table: "Usuarios",
                column: "ResponsavelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Produtos");

            migrationBuilder.DropTable(
                name: "Emprestimos");

            migrationBuilder.DropTable(
                name: "Lotes");

            migrationBuilder.DropTable(
                name: "Usuarios");
        }
    }
}
