using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public class UsuarioRepository(AppDbContext context, ILogger<UsuarioRepository> logger) : IUsuarioRepository
    {
        private readonly AppDbContext _context = context;
        private readonly ILogger<UsuarioRepository> _logger = logger;

        private readonly PasswordHasher<Usuario> _passwordHasher = new PasswordHasher<Usuario>();

        public async Task<Usuario?> ValidarUsuarioAsync(string email, string password)
        {
            // Busca o usuário pelo e-mail
            var user = await _context.Usuarios.SingleOrDefaultAsync(u => u.Email == email);

            if (user == null)
                return null;

            // Valida a senha usando PasswordHasher
            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.SenhaHash, password);

            if (verificationResult == PasswordVerificationResult.Success)
                return user; // Retorna o usuário se a senha estiver correta

            return null; // Retorna null se a senha for inválida    
        }

        public async Task<IEnumerable<Usuario>> GetAllAsync()
        {
            _logger.LogInformation("Iniciando operação para obter todos os usuarios.");
            var usuarios = await _context.Usuarios.ToListAsync();
            _logger.LogInformation("Operação concluída. {Count} usuarios obtidos.", usuarios.Count);
            return usuarios;
        }

        public async Task<Usuario?> GetByIdAsync(int id)
        {
            _logger.LogInformation("Iniciando operação para obter o usuario com ID {Id}.", id);
            var usuario = await _context.Usuarios.FindAsync(id);

            if (usuario == null)
            {
                _logger.LogWarning("Usuario com ID {Id} não encontrado.", id);
            }
            else
            {
                _logger.LogInformation("Usuario com ID {Id} obtido com sucesso.", id);
            }

            return usuario;
        }

        public async Task AddAsync(Usuario usuario)
        {
            _logger.LogInformation("Iniciando operação para adicionar um novo usuario: {Nome}.", usuario.NomeCompleto);
            await _context.Usuarios.AddAsync(usuario);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Usuario {Nome} adicionado com sucesso.", usuario.NomeCompleto);
        }

        public async Task UpdateAsync(Usuario usuario)
        {
            _logger.LogInformation("Iniciando operação para atualizar o usuario com ID {Id}.", usuario.Id);
            _context.Usuarios.Update(usuario);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Usuario com ID {Id} atualizado com sucesso.", usuario.Id);
        }

        public async Task DeleteAsync(int id)
        {
            _logger.LogInformation("Iniciando operação para deletar o usuario com ID {Id}.", id);
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario != null)
            {
                _context.Usuarios.Remove(usuario);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Usuario com ID {Id} deletado com sucesso.", id);
            }
            else
            {
                _logger.LogWarning("Usuario com ID {Id} não encontrado para exclusão.", id);
            }
        }
    }
}