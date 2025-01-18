
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IEmprestimoService
    {
        Task<IEnumerable<object>> GetEmprestimosSolicitadosUsuario(int userId);
        Task<IEnumerable<object>> GetEmprestimosAprovadosUsuario(int userId);
        Task<IEnumerable<object>> GetEmprestimosUsuario(int userId);
    }
}