using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class LoanStockMovements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MovimentacoesEstoque",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EmprestimoId = table.Column<int>(type: "integer", nullable: false),
                    ProdutoId = table.Column<int>(type: "integer", nullable: false),
                    Quantidade = table.Column<int>(type: "integer", nullable: false),
                    Instante = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtorId = table.Column<int>(type: "integer", nullable: false),
                    LoteId = table.Column<int>(type: "integer", nullable: true),
                    Tipo = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimentacoesEstoque", x => x.Id);
                    table.CheckConstraint("CK_MovimentacoesEstoque_Quantidade_Positive", "\"Quantidade\" > 0");
                    table.ForeignKey(
                        name: "FK_MovimentacoesEstoque_Emprestimos_EmprestimoId",
                        column: x => x.EmprestimoId,
                        principalTable: "Emprestimos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MovimentacoesEstoque_Lotes_LoteId",
                        column: x => x.LoteId,
                        principalTable: "Lotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MovimentacoesEstoque_Produtos_ProdutoId",
                        column: x => x.ProdutoId,
                        principalTable: "Produtos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MovimentacoesEstoque_Usuarios_AtorId",
                        column: x => x.AtorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MovimentacoesEstoque_AtorId",
                table: "MovimentacoesEstoque",
                column: "AtorId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimentacoesEstoque_LoteId",
                table: "MovimentacoesEstoque",
                column: "LoteId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimentacoesEstoque_ProdutoId",
                table: "MovimentacoesEstoque",
                column: "ProdutoId");

            migrationBuilder.CreateIndex(
                name: "UX_MovimentacoesEstoque_Emprestimo_Produto_Tipo",
                table: "MovimentacoesEstoque",
                columns: new[] { "EmprestimoId", "ProdutoId", "Tipo" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $loan_stock_movement_rollback$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "MovimentacoesEstoque") THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '55000',
                            MESSAGE = 'Loan stock movements contain durable history and cannot be dropped by migration rollback.';
                    END IF;
                END $loan_stock_movement_rollback$;
                """);

            migrationBuilder.DropTable(
                name: "MovimentacoesEstoque");
        }
    }
}
