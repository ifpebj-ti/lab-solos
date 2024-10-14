using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class InitialCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Produtos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Codigo = table.Column<string>(type: "TEXT", nullable: false),
                    Lote = table.Column<string>(type: "TEXT", nullable: false),
                    Tipo = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantidade = table.Column<double>(type: "REAL", nullable: false),
                    QuantidadeMinima = table.Column<double>(type: "REAL", nullable: false),
                    DataValidade = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LocalizacaoProduto = table.Column<string>(type: "TEXT", nullable: false),
                    Marca = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false),
                    UltimaModificacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Catmat = table.Column<string>(type: "TEXT", nullable: true),
                    UnidadeMedida = table.Column<int>(type: "INTEGER", nullable: true),
                    Grupo = table.Column<int>(type: "INTEGER", nullable: true),
                    Formula = table.Column<string>(type: "TEXT", nullable: true),
                    Volumetria = table.Column<double>(type: "REAL", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Produtos", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Produtos");
        }
    }
}
