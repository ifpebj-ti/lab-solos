using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Data; // Substitua pelo namespace correto do DbContext
using Microsoft.EntityFrameworkCore;
using LabSolos_Server_DotNet8.Data.Context;

namespace LabSolos_Server_DotNet8.Repositories
{
    public class EmprestimoRepository(AppDbContext context) : IEmprestimoRepository
    {
        private readonly AppDbContext _context = context;

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosUsuario(int userId)
        {
            return await _context.Emprestimos
                .Where(e => e.SolicitanteId == userId || e.AprovadorId == userId)
                .Include(e => e.Produto) // Inclui o produto relacionado
                .ToListAsync();
        }

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosSolicitadosUsuario(int userId)
        {            
            return await _context.Emprestimos
                .Where(e => e.SolicitanteId == userId)
                .Include(e => e.Produto) // Inclui o produto relacionado
                .ToListAsync();
        }

        public async Task<IEnumerable<Emprestimo>> GetEmprestimosAprovadosUsuario(int userId)
        {
            return await _context.Emprestimos
                .Where(e => e.AprovadorId == userId)
                .Include(e => e.Produto) // Inclui o produto relacionado
                .ToListAsync();
        }
    }
}
