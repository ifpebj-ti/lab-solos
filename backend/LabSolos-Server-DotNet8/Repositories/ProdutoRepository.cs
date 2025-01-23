using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IProdutoRepository
    {
        Task<IEnumerable<Produto>> GetAllAsync();
        Task<List<Produto>> GetProdutosByIds(List<int> produtosIds);
        Task<Produto?> GetByIdAsync(int id);
        Task AddAsync(Produto produto);
        Task UpdateAsync(Produto produto);
        Task UpdateProdutos(IEnumerable<Produto> produtos);
        Task DeleteAsync(int id);
    }
    
    public class ProdutoRepository(AppDbContext context, ILogger<ProdutoRepository> logger) : IProdutoRepository
    {
        private readonly AppDbContext _context = context;
        private readonly ILogger<ProdutoRepository> _logger = logger;

        public async Task<IEnumerable<Produto>> GetAllAsync()
        {
            _logger.LogInformation("Iniciando operação para obter todos os produtos.");
            var produtos = await _context.Produtos.ToListAsync();
            _logger.LogInformation("Operação concluída. {Count} produtos obtidos.", produtos.Count);
            return produtos;
        }

        public async Task<List<Produto>> GetProdutosByIds(List<int> produtosIds)
        {
            return await _context.Produtos
                .Where(p => produtosIds.Contains(p.Id))
                .ToListAsync();
        }

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
                        UltimaModificacao = DateTime.Now,
                        Catmat = (produto as Quimico)?.Catmat,
                        UnidadeMedida = (produto as Quimico)!.UnidadeMedida,
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
                        LocalizacaoProduto = produto.LocalizacaoProduto ?? "Não indicado",
                        Status = StatusProduto.Disponivel,
                        UltimaModificacao = DateTime.Now,
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