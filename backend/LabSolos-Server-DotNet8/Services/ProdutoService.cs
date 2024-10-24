using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public class ProdutoService : IProdutoService
    {
        private readonly IProdutoRepository _produtoRepository;

        public ProdutoService(IProdutoRepository produtoRepository)
        {
            _produtoRepository = produtoRepository;
        }

        public async Task<IEnumerable<Produto>> GetAllAsync()
        {
            return await _produtoRepository.GetAllAsync();
        }

        public async Task<Produto> GetByIdAsync(int id)
        {
            return await _produtoRepository.GetByIdAsync(id);
        }

        public async Task AddAsync(Produto produto)
        {
            await _produtoRepository.AddAsync(produto);
        }

        public async Task UpdateAsync(Produto produto)
        {
            await _produtoRepository.UpdateAsync(produto);
        }

        public async Task DeleteAsync(int id)
        {
            await _produtoRepository.DeleteAsync(id);
        }
    }
}