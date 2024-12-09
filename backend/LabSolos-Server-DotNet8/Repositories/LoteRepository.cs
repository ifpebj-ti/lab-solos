using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public class LoteRepository(AppDbContext context) : ILoteRepository
    {
        public readonly AppDbContext _context = context;
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
                .Include(l => l.Produtos) // Inclui os produtos relacionados ao lote
                .FirstOrDefaultAsync(l => l.Id == id);

        }

        public async Task<Lote?> GetLoteByCodigoAsync(string codigoLote)
        {
            return await _context.Lotes
                .Include(l => l.Produtos) // Inclui os produtos relacionados ao lote
                .FirstOrDefaultAsync(l => l.CodigoLote == codigoLote);
        }
    }
}