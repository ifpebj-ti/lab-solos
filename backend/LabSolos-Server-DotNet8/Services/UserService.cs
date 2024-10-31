using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services
{
    public class UserService(AppDbContext context) : IUserService
    {
        private readonly AppDbContext _context = context;
        private readonly PasswordHasher<Usuario> _passwordHasher = new PasswordHasher<Usuario>();

        public async Task<Usuario?> ValidateUserAsync(string email, string password)
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
    }
}