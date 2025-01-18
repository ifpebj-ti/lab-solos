using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public class EmprestimoService(IEmprestimoRepository emprestimoRepository) : IEmprestimoService
    {
        private readonly IEmprestimoRepository _emprestimoRepository = emprestimoRepository;

        public async Task<IEnumerable<object>> GetEmprestimosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosUsuario(userId);

            return emprestimos;
        }

        public async Task<IEnumerable<object>> GetEmprestimosSolicitadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosSolicitadosUsuario(userId);

            return emprestimos;
        }

        public async Task<IEnumerable<object>> GetEmprestimosAprovadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosAprovadosUsuario(userId);

            return emprestimos;
        }
    }
}
