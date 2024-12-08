using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;


namespace LabSolos_Server_DotNet8.Services
{
    public interface ILoteService
    {
        // Task<IEnumerable<Lote>> GetAllAsync();
        // Task<Lote?> GetByIdAsync(int id);
        // Task UpdateAsync(Lote lote);
        // Task DeleteAsync(int id);


        ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto);
        Task AddLoteProdutosAsync(Produto produto, string codigoLote);
        Task<Lote?> GetLoteByIdAsync(int id);
        Task<Lote?> GetLoteByCodigoAsync(string codigoLote);
        Produto AddProdutoPorTipo(AddLoteDTO loteDto);
    }
}