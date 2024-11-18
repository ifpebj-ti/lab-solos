using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
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
            await _context.Produtos.AddAsync(produto);
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