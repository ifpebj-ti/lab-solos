using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Data; // Substitua pelo namespace correto do DbContext
using Microsoft.EntityFrameworkCore;
using LabSolos_Server_DotNet8.Data.Context;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IEmprestimoRepository
    {
        Task<Emprestimo?> GetByIdAsync(int id);
        Task<IEnumerable<Emprestimo>> GetTodosEmprestimosAsync();
        Task<IEnumerable<Emprestimo>> GetEmprestimosSolicitadosUsuario(int userId);
        Task<IEnumerable<Emprestimo>> GetEmprestimosAprovadosUsuario(int userId);
        Task<IEnumerable<Emprestimo>> GetEmprestimosUsuario(int userId);
        Task<Emprestimo> AddEmprestimo(Emprestimo emprestimo);
        Task UpdateAsync(Emprestimo emprestimo);
    }
    
    public class EmprestimoRepository(AppDbContext context) : IEmprestimoRepository
    {
        private readonly AppDbContext _context = context;

        public async Task<Emprestimo?> GetByIdAsync(int id)
        {
            return await _context.Emprestimos
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
                .Include(e => e.Produtos)
                    .ThenInclude(ep => ep.Produto)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<IEnumerable<Emprestimo>> GetTodosEmprestimosAsync()
        {
            return await _context.Emprestimos
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
                .Include(e => e.Produtos)
                    .ThenInclude(ep => ep.Produto)
                .ToListAsync();
        }

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosUsuario(int userId)
        {
            return await _context.Emprestimos
                .Where(e => e.SolicitanteId == userId || e.AprovadorId == userId)
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
                .Include(e => e.Produtos)
                    .ThenInclude(ep => ep.Produto)
                .ToListAsync();
        }

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosSolicitadosUsuario(int userId)
        {            
            return await _context.Emprestimos
                .Where(e => e.SolicitanteId == userId)
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
                .Include(e => e.Produtos)
                    .ThenInclude(ep => ep.Produto)
                .ToListAsync();
        }

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosAprovadosUsuario(int userId)
        {
            return await _context.Emprestimos
                .Where(e => e.AprovadorId == userId)
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
                .Include(e => e.Produtos)
                    .ThenInclude(ep => ep.Produto)
                .ToListAsync();
        }

        public async Task<Emprestimo> AddEmprestimo(Emprestimo emprestimo)
        {
            await _context.Emprestimos.AddAsync(emprestimo);
            await _context.SaveChangesAsync();
            return emprestimo;
        }

        public async Task UpdateAsync(Emprestimo emprestimo)
        {
            _context.Emprestimos.Update(emprestimo);
            await _context.SaveChangesAsync();
        }
    }
}
