using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class CredentialLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TokenRedefinicao",
                table: "Usuarios",
                newName: "TokenRedefinicaoHash");

            migrationBuilder.AddColumn<bool>(
                name: "ExigeTrocaSenha",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "VersaoSessao",
                table: "Usuarios",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql(
                "UPDATE \"Usuarios\" SET \"TokenRedefinicaoHash\" = NULL, \"TokenExpiracao\" = NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExigeTrocaSenha",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "VersaoSessao",
                table: "Usuarios");

            migrationBuilder.RenameColumn(
                name: "TokenRedefinicaoHash",
                table: "Usuarios",
                newName: "TokenRedefinicao");
        }
    }
}
