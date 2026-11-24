using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class SessaoAutenticacao : Migration
    {
        private static readonly string[] UserSessionIndexColumns = ["UsuarioId", "ExpiraEmUtc"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessoesAutenticacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IdentificadorHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    JwtIdHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    VersaoSessao = table.Column<long>(type: "bigint", nullable: false),
                    CriadaEmUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UltimaAtividadeEmUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiraEmUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevogadaEmUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Revisao = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessoesAutenticacao", x => x.Id);
                    table.CheckConstraint("CK_SessoesAutenticacao_Activity", "\"UltimaAtividadeEmUtc\" >= \"CriadaEmUtc\"");
                    table.CheckConstraint("CK_SessoesAutenticacao_Expiry", "\"ExpiraEmUtc\" > \"CriadaEmUtc\"");
                    table.CheckConstraint("CK_SessoesAutenticacao_IdentifierHash_Length", "octet_length(\"IdentificadorHash\") = 64");
                    table.CheckConstraint("CK_SessoesAutenticacao_JwtIdHash_Length", "\"JwtIdHash\" IS NULL OR octet_length(\"JwtIdHash\") = 64");
                    table.CheckConstraint("CK_SessoesAutenticacao_Revision", "\"Revisao\" >= 0");
                    table.CheckConstraint("CK_SessoesAutenticacao_SessionVersion", "\"VersaoSessao\" >= 0");
                    table.ForeignKey(
                        name: "FK_SessoesAutenticacao_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessoesAutenticacao_User_Expiry",
                table: "SessoesAutenticacao",
                columns: UserSessionIndexColumns);

            migrationBuilder.CreateIndex(
                name: "UX_SessoesAutenticacao_IdentifierHash",
                table: "SessoesAutenticacao",
                column: "IdentificadorHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SessoesAutenticacao_JwtIdHash",
                table: "SessoesAutenticacao",
                column: "JwtIdHash",
                unique: true,
                filter: "\"JwtIdHash\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessoesAutenticacao");
        }
    }
}
