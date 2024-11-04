using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IProdutoService
    {
        Task<IEnumerable<Produto>> GetAllAsync();
        Task<Produto> GetByIdAsync(int id);
        Task AddAsync(Produto produto);
        Task UpdateAsync(Produto produto);
        Task DeleteAsync(int id);
    }
}