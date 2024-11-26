using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IUsuarioRepository
    {
        Task<IEnumerable<Usuario>> GetAllAsync();
        Task<Usuario?> GetByIdAsync(int id);
        Task AddAsync(Usuario usuario);
        Task UpdateAsync(Usuario usuario);
        Task DeleteAsync(int id);
        Task<Usuario?> ValidarUsuarioAsync(string email, string password);
    }    
}