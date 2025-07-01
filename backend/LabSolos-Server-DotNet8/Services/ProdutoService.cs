using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IProdutoService
    {
        ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO);
        Task<HistoricoSaidaProdutoResponseDTO?> ObterHistoricoSaidaProdutoAsync(int produtoId);
    }

    public class ProdutoService : IProdutoService
    {
        private readonly ILogger<ProdutoService> _logger;
        private readonly IUnitOfWork _uow;

        public ProdutoService(ILogger<ProdutoService> logger, IUnitOfWork uow)
        {
            _logger = logger;
            _uow = uow;
        }

        public ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO)
        {
            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Quimico.ToString() && (
                string.IsNullOrEmpty(produtoDTO.DataValidade) ||
                string.IsNullOrEmpty(produtoDTO.UnidadeMedida) ||
                string.IsNullOrEmpty(produtoDTO.FormulaQuimica)))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Quimico', os campos 'DataValidade', 'UnidadeMedida' e 'FormulaQuimica' são obrigatórios"
                };
            }

            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Vidraria.ToString() && (
                !produtoDTO.Capacidade.HasValue))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Vidraria', o campo 'Capacidade' é obrigatório"
                };
            }


            // Se todas as validações passarem
            return new ResultadoValidacaoDTO
            {
                Validado = true,
                Mensagem = string.Empty
            };
        }

        public async Task<HistoricoSaidaProdutoResponseDTO?> ObterHistoricoSaidaProdutoAsync(int produtoId)
        {
            try
            {
                var produto = await _uow.ProdutoRepository
                    .ObterAsync(
                        predicate: p => p.Id == produtoId,
                        include: query => query.Include(p => p.Lote)
                    );

                if (produto == null)
                {
                    _logger.LogWarning("Produto com ID {ProdutoId} não encontrado", produtoId);
                    return null;
                }

                var historico = await _uow.ProdutoEmprestadoRepository
                    .ObterTodosAsync(
                        predicate: pe => pe.ProdutoId == produtoId,
                        include: query => query
                            .Include(pe => pe.Emprestimo)
                                .ThenInclude(e => e.Solicitante)
                            .Include(pe => pe.Emprestimo)
                                .ThenInclude(e => e.Aprovador)
                    );

                var historicoDto = historico.Select(pe => new HistoricoSaidaProdutoDTO
                {
                    EmprestimoId = pe.EmprestimoId,
                    DataEmprestimo = pe.Emprestimo.DataRealizacao,
                    DataDevolucao = pe.Emprestimo.DataDevolucao,
                    QuantidadeEmprestada = pe.Quantidade,
                    StatusEmprestimo = pe.Emprestimo.Status.ToString(),
                    Solicitante = new UsuarioEmprestimoDTO
                    {
                        Id = pe.Emprestimo.Solicitante.Id,
                        Nome = pe.Emprestimo.Solicitante.NomeCompleto,
                        Email = pe.Emprestimo.Solicitante.Email,
                        Instituicao = null // Será preenchido posteriormente se necessário
                    },
                    Aprovador = pe.Emprestimo.Aprovador != null ? new UsuarioEmprestimoDTO
                    {
                        Id = pe.Emprestimo.Aprovador.Id,
                        Nome = pe.Emprestimo.Aprovador.NomeCompleto,
                        Email = pe.Emprestimo.Aprovador.Email,
                        Instituicao = null // Será preenchido posteriormente se necessário
                    } : null,
                    Identificador = ObterIdentificadorUsuario(pe.Emprestimo.Solicitante),
                    Lote = produto.Lote?.CodigoLote
                }).OrderByDescending(h => h.DataEmprestimo).ToList();

                var response = new HistoricoSaidaProdutoResponseDTO
                {
                    ProdutoId = produto.Id,
                    NomeProduto = produto.NomeProduto,
                    TipoProduto = produto.Tipo.ToString(),
                    EstoqueAtual = produto.Quantidade,
                    UnidadeMedida = produto.UnidadeMedida.ToString(),
                    Historico = historicoDto,
                    TotalEmprestimos = historicoDto.Count(),
                    TotalQuantidadeEmprestada = historicoDto.Sum(h => h.QuantidadeEmprestada)
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter histórico de saída do produto {ProdutoId}", produtoId);
                throw;
            }
        }

        private string? ObterIdentificadorUsuario(Usuario usuario)
        {
            // Para identificador, vamos usar o próprio email como identificador único
            return usuario.Email;
        }

    }
}