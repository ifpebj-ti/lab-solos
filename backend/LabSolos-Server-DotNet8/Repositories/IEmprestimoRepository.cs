using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IEmprestimoRepository
    {
        Task<IEnumerable<Emprestimo>> GetEmprestimosSolicitadosUsuario(int userId);
        Task<IEnumerable<Emprestimo>> GetEmprestimosAprovadosUsuario(int userId);
        Task<IEnumerable<Emprestimo>> GetEmprestimosUsuario(int userId);
    }
}