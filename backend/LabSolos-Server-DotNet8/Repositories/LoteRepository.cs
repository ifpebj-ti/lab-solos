using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface ILoteRepository
    {
        Task<Lote> AddLoteAsync(Lote lote);
        Task<Lote?> GetLoteByIdAsync(int id);
        Task<Lote?> GetLoteByCodigoAsync(string codigoLote);
    }
    
    public class LoteRepository(AppDbContext context) : ILoteRepository
    {
        private readonly AppDbContext _context = context;
        public async Task<Lote?> GetLoteByCodigoAsync(int codigoLote)
        {
            return await _context.Lotes
                .FirstOrDefaultAsync(lote => lote.CodigoLote == codigoLote.ToString());
        }

        public async Task<Lote> AddLoteAsync(Lote lote)
        {
            _context.Lotes.Add(lote);
            await _context.SaveChangesAsync();
            return lote;
        }

        public async Task<Lote?> GetLoteByIdAsync(int id)
        {
            return await _context.Lotes
                .AsNoTracking()
                .Include(l => l.Produtos) // Inclui os produtos relacionados ao lote
                .FirstOrDefaultAsync(l => l.Id == id);

        }

        public async Task<Lote?> GetLoteByCodigoAsync(string codigoLote)
        {
            var normalized = codigoLote.Trim().ToLowerInvariant();
            return await _context.Lotes
                .AsNoTracking()
                .Include(l => l.Produtos) // Inclui os produtos relacionados ao lote
                .FirstOrDefaultAsync(l => EF.Property<string>(l, "CodigoNormalizado") == normalized);
        }
    }
}
