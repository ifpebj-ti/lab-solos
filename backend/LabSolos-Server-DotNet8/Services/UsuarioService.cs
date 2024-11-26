using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services
{
    public class UsuarioService(IUsuarioRepository usuarioRepository, ILogger<UsuarioService> logger) : IUsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepository = usuarioRepository;
        private readonly ILogger<UsuarioService> _logger = logger;

        public async Task<Usuario?> ValidarUsuarioAsync(string email, string password)
        {
            return await _usuarioRepository.ValidarUsuarioAsync(email, password);
        }
    
        public async Task<IEnumerable<object>> GetUsuariosByTipoAsync(TipoUsuario tipoUsuario)
        {
            return [];
        }

        public async Task<IEnumerable<Usuario>> GetAllAsync()
        {
            return await _usuarioRepository.GetAllAsync();
        }

        public async Task<Usuario?> GetByIdAsync(int id)
        {
            return await _usuarioRepository.GetByIdAsync(id);
        }

        public async Task AddAsync(Usuario usuario)
        {
            await _usuarioRepository.AddAsync(usuario);
        }

        public async Task UpdateAsync(Usuario usuario)
        {
            await _usuarioRepository.UpdateAsync(usuario);
        }

        public async Task DeleteAsync(int id)
        {
            await _usuarioRepository.DeleteAsync(id);
        }
    }
}