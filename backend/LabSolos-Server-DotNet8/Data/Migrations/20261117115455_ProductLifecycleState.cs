using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProductLifecycleState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProdutosEmprestados_Produtos_ProdutoId",
                table: "ProdutosEmprestados");

            migrationBuilder.AddColumn<bool>(
                name: "Desativado",
                table: "Produtos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_ProdutosEmprestados_Produtos_ProdutoId",
                table: "ProdutosEmprestados",
                column: "ProdutoId",
                principalTable: "Produtos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $product_lifecycle_rollback$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "Produtos" WHERE "Desativado") THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '55000',
                            MESSAGE = 'Produtos desativados nao podem perder seu estado de ciclo de vida no rollback.';
                    END IF;

                    IF EXISTS (SELECT 1 FROM "ProdutosEmprestados") THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '55000',
                            MESSAGE = 'Vinculos de produto em emprestimos impedem rollback para chave estrangeira em cascata.';
                    END IF;
                END $product_lifecycle_rollback$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_ProdutosEmprestados_Produtos_ProdutoId",
                table: "ProdutosEmprestados");

            migrationBuilder.DropColumn(
                name: "Desativado",
                table: "Produtos");

            migrationBuilder.AddForeignKey(
                name: "FK_ProdutosEmprestados_Produtos_ProdutoId",
                table: "ProdutosEmprestados",
                column: "ProdutoId",
                principalTable: "Produtos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
