using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface ILoteRepository
    {
        Task<Lote> AddLoteAsync(Lote lote);
        Task<Lote?> GetLoteByIdAsync(int id);
        Task<Lote?> GetLoteByCodigoAsync(string codigoLote);
    }
}