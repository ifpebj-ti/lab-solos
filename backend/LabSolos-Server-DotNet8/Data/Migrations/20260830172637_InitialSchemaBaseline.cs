using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchemaBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Lotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CodigoLote = table.Column<string>(type: "text", nullable: false),
                    Fornecedor = table.Column<string>(type: "text", nullable: true),
                    DataFabricacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DataValidade = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DataEntrada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NomeCompleto = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    SenhaHash = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: true),
                    DataIngresso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NivelUsuario = table.Column<int>(type: "integer", nullable: false),
                    TipoUsuario = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResponsavelId = table.Column<int>(type: "integer", nullable: true),
                    TokenRedefinicao = table.Column<string>(type: "text", nullable: true),
                    TokenExpiracao = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Instituicao = table.Column<string>(type: "text", nullable: true),
                    Cidade = table.Column<string>(type: "text", nullable: true),
                    Curso = table.Column<string>(type: "text", nullable: true)
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
                name: "Produtos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Catmat = table.Column<string>(type: "text", nullable: true),
                    NomeProduto = table.Column<string>(type: "text", nullable: false),
                    Fornecedor = table.Column<string>(type: "text", nullable: true),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Quantidade = table.Column<float>(type: "real", nullable: false),
                    QuantidadeMinima = table.Column<float>(type: "real", nullable: false),
                    UnidadeMedida = table.Column<int>(type: "integer", nullable: false),
                    DataFabricacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DataValidade = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LocalizacaoProduto = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    UltimaModificacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LoteId = table.Column<int>(type: "integer", nullable: true),
                    EstadoFisico = table.Column<int>(type: "integer", nullable: true),
                    Cor = table.Column<int>(type: "integer", nullable: true),
                    Odor = table.Column<int>(type: "integer", nullable: true),
                    Densidade = table.Column<float>(type: "real", nullable: true),
                    PesoMolecular = table.Column<float>(type: "real", nullable: true),
                    GrauPureza = table.Column<string>(type: "text", nullable: true),
                    FormulaQuimica = table.Column<string>(type: "text", nullable: true),
                    Grupo = table.Column<int>(type: "integer", nullable: true),
                    Material = table.Column<int>(type: "integer", nullable: true),
                    Formato = table.Column<int>(type: "integer", nullable: true),
                    Altura = table.Column<int>(type: "integer", nullable: true),
                    Capacidade = table.Column<float>(type: "real", nullable: true),
                    Graduada = table.Column<bool>(type: "boolean", nullable: true)
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

            migrationBuilder.CreateTable(
                name: "Emprestimos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DataRealizacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataDevolucao = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DataAprovacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SolicitanteId = table.Column<int>(type: "integer", nullable: false),
                    AprovadorId = table.Column<int>(type: "integer", nullable: true)
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
                name: "LogsAuditoria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DataHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Acao = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Recurso = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Detalhes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    EnderecoIP = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TipoAcao = table.Column<int>(type: "integer", nullable: false),
                    NivelRisco = table.Column<int>(type: "integer", nullable: false),
                    Suspeita = table.Column<bool>(type: "boolean", nullable: false),
                    MotivoSuspeita = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    DadosRequisicao = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DadosResposta = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TempoSessao = table.Column<TimeSpan>(type: "interval", nullable: true),
                    TentativasAcesso = table.Column<int>(type: "integer", nullable: true),
                    Origem = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LogsAuditoria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LogsAuditoria_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Notificacoes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Mensagem = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    Lida = table.Column<bool>(type: "boolean", nullable: false),
                    DataCriacao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataLeitura = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LinkAcao = table.Column<string>(type: "text", nullable: true),
                    ReferenciaId = table.Column<int>(type: "integer", nullable: true),
                    TipoReferencia = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notificacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notificacoes_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProdutosEmprestados",
                columns: table => new
                {
                    EmprestimoId = table.Column<int>(type: "integer", nullable: false),
                    ProdutoId = table.Column<int>(type: "integer", nullable: false),
                    Quantidade = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProdutosEmprestados", x => new { x.EmprestimoId, x.ProdutoId });
                    table.ForeignKey(
                        name: "FK_ProdutosEmprestados_Emprestimos_EmprestimoId",
                        column: x => x.EmprestimoId,
                        principalTable: "Emprestimos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProdutosEmprestados_Produtos_ProdutoId",
                        column: x => x.ProdutoId,
                        principalTable: "Produtos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                name: "IX_LogsAuditoria_DataHora",
                table: "LogsAuditoria",
                column: "DataHora");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_DataHora_UsuarioId_TipoAcao",
                table: "LogsAuditoria",
                columns: new[] { "DataHora", "UsuarioId", "TipoAcao" });

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_EnderecoIP",
                table: "LogsAuditoria",
                column: "EnderecoIP");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_NivelRisco",
                table: "LogsAuditoria",
                column: "NivelRisco");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_Suspeita",
                table: "LogsAuditoria",
                column: "Suspeita");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_TipoAcao",
                table: "LogsAuditoria",
                column: "TipoAcao");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_UsuarioId",
                table: "LogsAuditoria",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_DataCriacao",
                table: "Notificacoes",
                column: "DataCriacao");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_Lida",
                table: "Notificacoes",
                column: "Lida");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Produtos_LoteId",
                table: "Produtos",
                column: "LoteId");

            migrationBuilder.CreateIndex(
                name: "IX_ProdutosEmprestados_ProdutoId",
                table: "ProdutosEmprestados",
                column: "ProdutoId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_ResponsavelId",
                table: "Usuarios",
                column: "ResponsavelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LogsAuditoria");

            migrationBuilder.DropTable(
                name: "Notificacoes");

            migrationBuilder.DropTable(
                name: "ProdutosEmprestados");

            migrationBuilder.DropTable(
                name: "Emprestimos");

            migrationBuilder.DropTable(
                name: "Produtos");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Lotes");
        }
    }
}
