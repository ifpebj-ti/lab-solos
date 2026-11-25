using System;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Paginacao;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IProdutoRepository
    {
        Task<IEnumerable<Produto>> GetAllAsync();
        Task<ResultadoPaginado<Produto>> GetPaginadoAsync(
            System.Linq.Expressions.Expression<Func<Produto, bool>> predicate,
            ParametrosPaginacao parametros,
            CancellationToken cancellationToken = default);
        Task<IEnumerable<Produto>> GetCatalogoAdministrativoAsync(CancellationToken cancellationToken = default);
        Task<IEnumerable<Produto>> GetProdutosEmAlertaAsync(
            DateOnly hojeCivil,
            CancellationToken cancellationToken = default);
        Task<List<Produto>> GetProdutosByIds(List<int> produtosIds);
        Task LockForLoanDecisionAsync(IEnumerable<int> productIds, CancellationToken cancellationToken = default);
        Task<Produto?> GetByIdAsync(int id);
        Task AddAsync(Produto produto);
        Task UpdateAsync(Produto produto);
        Task UpdateProdutos(IEnumerable<Produto> produtos);
        Task DeleteAsync(int id);
    }
    
    public class ProdutoRepository(
        AppDbContext context,
        ILogger<ProdutoRepository> logger,
        IUnitOfWork unitOfWork) : IProdutoRepository
    {
        private static readonly Action<ILogger, Exception?> LogAdministrativeCatalogStarted =
            LoggerMessage.Define(LogLevel.Information,
                new EventId(2201, nameof(LogAdministrativeCatalogStarted)),
                "Iniciando consulta do catálogo administrativo de produtos.");
        private static readonly Action<ILogger, int, Exception?> LogAdministrativeCatalogLoaded =
            LoggerMessage.Define<int>(LogLevel.Information,
                new EventId(2202, nameof(LogAdministrativeCatalogLoaded)),
                "Catálogo administrativo carregado com {Count} produtos.");
        private static readonly Action<ILogger, int, Exception?> LogAlertsLoaded =
            LoggerMessage.Define<int>(LogLevel.Information,
                new EventId(2203, nameof(LogAlertsLoaded)),
                "Consulta de alertas retornou {Count} produtos elegíveis.");
        private readonly AppDbContext _context = context;
        private readonly ILogger<ProdutoRepository> _logger = logger;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;

        public async Task<IEnumerable<Produto>> GetAllAsync()
        {
            _logger.LogInformation("Iniciando operação para obter todos os produtos.");
            var produtos = await _context.Produtos.Where(product => !product.Desativado).ToListAsync();
            _logger.LogInformation("Operação concluída. {Count} produtos obtidos.", produtos.Count);
            return produtos;
        }

        public async Task<ResultadoPaginado<Produto>> GetPaginadoAsync(
            System.Linq.Expressions.Expression<Func<Produto, bool>> predicate,
            ParametrosPaginacao parametros,
            CancellationToken cancellationToken = default)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.RepeatableRead, cancellationToken);

            var filteredQuery = _context.Produtos
                .AsNoTracking()
                .Where(predicate);
            var totalItens = await filteredQuery.LongCountAsync(cancellationToken);
            var itens = await filteredQuery
                .Include(product => product.Lote)
                .OrderBy(product => product.NomeProduto)
                .ThenBy(product => product.Id)
                .Skip(parametros.Deslocamento)
                .Take(parametros.TamanhoPagina)
                .ToListAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return ResultadoPaginado.Criar(
                itens, parametros.Pagina, parametros.TamanhoPagina, totalItens);
        }

        public async Task<IEnumerable<Produto>> GetCatalogoAdministrativoAsync(
            CancellationToken cancellationToken = default)
        {
            LogAdministrativeCatalogStarted(_logger, null);
            var produtos = await _context.Produtos
                .Where(product => !product.Desativado)
                .Include(product => product.Lote)
                .OrderBy(product => product.Id)
                .ToListAsync(cancellationToken);
            LogAdministrativeCatalogLoaded(_logger, produtos.Count, null);
            return produtos;
        }

        public async Task<IEnumerable<Produto>> GetProdutosEmAlertaAsync(
            DateOnly hojeCivil,
            CancellationToken cancellationToken = default)
        {
            var inicioDoDiaSeguinteAoLimite = hojeCivil.AddDays(11)
                .ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var produtosComEstoqueBaixo = _context.Produtos
                .Where(ProductStockAlertRule.BelowMinimum)
                .Select(product => product.Id);
            var produtosComValidadeProxima = _context.Produtos
                .Where(product => product.DataValidade.HasValue &&
                                  product.DataValidade.Value < inicioDoDiaSeguinteAoLimite)
                .Select(product => product.Id);
            var produtosElegiveis = produtosComEstoqueBaixo.Union(produtosComValidadeProxima);
            var produtos = await _context.Produtos
                .Where(product => !product.Desativado && produtosElegiveis.Contains(product.Id))
                .Include(product => product.Lote)
                .OrderBy(product => product.Id)
                .ToListAsync(cancellationToken);
            LogAlertsLoaded(_logger, produtos.Count, null);
            return produtos;
        }

        public async Task<List<Produto>> GetProdutosByIds(List<int> produtosIds)
        {
            return await _context.Produtos
                .Where(p => !p.Desativado && produtosIds.Contains(p.Id))
                .ToListAsync();
        }

        public Task LockForLoanDecisionAsync(
            IEnumerable<int> productIds,
            CancellationToken cancellationToken = default) =>
            _unitOfWork.LockProductsForMutationAsync(productIds, cancellationToken);

        public async Task<Produto?> GetByIdAsync(int id)
        {
            _logger.LogInformation("Iniciando operação para obter o produto com ID {Id}.", id);
            var produto = await _context.Produtos.FindAsync(id);

            if (produto == null)
            {
                _logger.LogWarning("Produto com ID {Id} não encontrado.", id);
            }
            else
            {
                _logger.LogInformation("Produto com ID {Id} obtido com sucesso.", id);
            }

            return produto;
        }

        public async Task AddAsync(Produto produto)
        {
            _logger.LogInformation("Iniciando operação para adicionar um novo produto: {Nome}.", produto.NomeProduto);

            switch (produto.Tipo)
            {
                case TipoProduto.Quimico:
                    var quimico = new Quimico
                    {
                        NomeProduto = produto.NomeProduto,
                        Fornecedor = produto.Fornecedor,
                        Tipo = TipoProduto.Quimico,
                        Quantidade = produto.Quantidade,
                        QuantidadeMinima = produto.QuantidadeMinima,
                        DataFabricacao = produto.DataFabricacao,
                        DataValidade = produto.DataValidade,
                        LocalizacaoProduto = produto.LocalizacaoProduto,
                        Status = StatusProduto.Disponivel,
                        UltimaModificacao = DateTime.UtcNow,
                        Catmat = produto.Catmat,
                        UnidadeMedida = produto.UnidadeMedida,
                        EstadoFisico = (produto as Quimico)!.EstadoFisico,
                        Cor = (produto as Quimico)!.Cor,
                        Odor = (produto as Quimico)!.Odor,
                        Densidade = (produto as Quimico)?.Densidade,
                        PesoMolecular = (produto as Quimico)?.PesoMolecular,
                        GrauPureza = (produto as Quimico)?.GrauPureza,
                        FormulaQuimica = (produto as Quimico)?.FormulaQuimica,
                        Grupo = (produto as Quimico)!.Grupo,
                    };
                    await _context.Quimicos.AddAsync(quimico);
                    break;

                case TipoProduto.Vidraria:
                    var vidraria = new Vidraria
                    {
                        NomeProduto = produto.NomeProduto,
                        Fornecedor = produto.Fornecedor,
                        Tipo = TipoProduto.Vidraria,
                        Quantidade = produto.Quantidade,
                        QuantidadeMinima = produto.QuantidadeMinima,
                        DataFabricacao = produto.DataValidade,
                        Catmat = produto.Catmat,
                        UnidadeMedida = UnidadeMedida.Unidade,
                        LocalizacaoProduto = produto.LocalizacaoProduto ?? "Não indicado",
                        Status = StatusProduto.Disponivel,
                        UltimaModificacao = DateTime.UtcNow,
                        Material = (produto as Vidraria)!.Material,
                        Formato = (produto as Vidraria)!.Formato,
                        Altura = (produto as Vidraria)!.Altura,
                        Capacidade = (produto as Vidraria)?.Capacidade,
                        Graduada = (produto as Vidraria)?.Graduada,
                    };
                    await _context.Vidrarias.AddAsync(vidraria);
                    break;

                case TipoProduto.Outro:
                    await _context.Produtos.AddAsync(produto);
                    break;
                default:
                    _logger.LogError("Tipo de produto desconhecido: {Tipo}.", produto.Tipo);
                    throw new ArgumentException("Tipo de produto inválido.");

            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("Produto {Nome} adicionado com sucesso.", produto.NomeProduto);
        }

        public async Task UpdateAsync(Produto produto)
        {
            _logger.LogInformation("Iniciando operação para atualizar o produto com ID {Id}.", produto.Id);
            _context.Produtos.Update(produto);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Produto com ID {Id} atualizado com sucesso.", produto.Id);
        }

        public async Task UpdateProdutos(IEnumerable<Produto> produtos)
        {
            _context.Produtos.UpdateRange(produtos);
            await _context.SaveChangesAsync();
        }
        public async Task DeleteAsync(int id)
        {
            _logger.LogInformation("Iniciando operação para deletar o produto com ID {Id}.", id);
            var produto = await _context.Produtos.FindAsync(id);
            if (produto != null)
            {
                _context.Produtos.Remove(produto);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Produto com ID {Id} deletado com sucesso.", id);
            }
            else
            {
                _logger.LogWarning("Produto com ID {Id} não encontrado para exclusão.", id);
            }
        }
    }
}
