using Microsoft.AspNetCore.Identity;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using LabSolos_Server_DotNet8.Enums;

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
    
    public class UsuarioRepository(AppDbContext context, ILogger<UsuarioRepository> logger) : IUsuarioRepository
    {
        private readonly AppDbContext _context = context;
        private readonly ILogger<UsuarioRepository> _logger = logger;

        private readonly PasswordHasher<Usuario> _passwordHasher = new();

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

            switch (usuario.TipoUsuario)
            {
                case TipoUsuario.Administrador:
                    var admin = new Administrador
                    {
                        NomeCompleto = usuario.NomeCompleto,
                        Email = usuario.Email,
                        SenhaHash = usuario.SenhaHash,
                        Telefone = usuario.Telefone,
                        DataIngresso = usuario.DataIngresso,
                        NivelUsuario = usuario.NivelUsuario,
                        TipoUsuario = TipoUsuario.Administrador,
                        Status = usuario.Status
                    };
                    await _context.Administradores.AddAsync(admin);
                    break;

                case TipoUsuario.Academico:
                    var academico = new Academico
                    {
                        NomeCompleto = usuario.NomeCompleto,
                        Email = usuario.Email,
                        SenhaHash = usuario.SenhaHash,
                        Telefone = usuario.Telefone,
                        DataIngresso = usuario.DataIngresso,
                        NivelUsuario = usuario.NivelUsuario,
                        TipoUsuario = TipoUsuario.Academico,
                        Status = usuario.Status,
                        Instituicao = (usuario as Academico)!.Instituicao,
                        Cidade = (usuario as Academico)?.Cidade,
                        Curso = (usuario as Academico)?.Curso
                    };
                    await _context.Academicos.AddAsync(academico);
                    break;

                case TipoUsuario.Comum:
                    await _context.Usuarios.AddAsync(usuario);
                    break;

                default:
                    _logger.LogError("NivelUsuario desconhecido: {Nivel}.", usuario.NivelUsuario);
                    throw new ArgumentException("NivelUsuario inválido.");
                
            }
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