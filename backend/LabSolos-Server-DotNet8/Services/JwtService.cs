using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace LabSolos_Server_DotNet8.Services
{
    public class JwtService(IConfiguration config)
    {
        private readonly string _secret = config["Jwt:Key"]!;
        private readonly string _issuer = config["Jwt:Issuer"]!;
        private readonly string _audience = config["Jwt:Audience"]!;
        private readonly int _expiresInMinutes = int.Parse(config["Jwt:ExpiresInMinutes"]!);

        public string GenerateToken(string userId, string userEmail, string nivel)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(
                [
                    new Claim(JwtRegisteredClaimNames.Sub, userId),
                    new Claim(JwtRegisteredClaimNames.Email, userEmail),
                    new Claim(ClaimTypes.Role, nivel),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                ]),
                Expires = DateTime.UtcNow.AddMinutes(_expiresInMinutes),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public static string HashPassword(Usuario usuario, string senha)
        {
            var hasher = new PasswordHasher<Usuario>();
            return hasher.HashPassword(usuario, senha);
        }


    }
}