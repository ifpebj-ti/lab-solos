using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;


namespace LabSolos_Server_DotNet8.Services
{
    public interface IUsuarioService
    {
        Task<IEnumerable<Usuario>> GetAllAsync();
        Task<IEnumerable<object>> GetUsuariosByTipoAsync(TipoUsuario tipoUsuario);
        Task<Usuario?> GetByIdAsync(int id);
        Task AddAsync(Usuario usuario);
        Task UpdateAsync(Usuario usuario);
        Task DeleteAsync(int id);
        Task<Usuario?> ValidarUsuarioAsync(string email, string password);
    }
}