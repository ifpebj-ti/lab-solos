using System.IdentityModel.Tokens.Jwt;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using LabSolos_Server_DotNet8.Models;
using Microsoft.IdentityModel.Tokens;

namespace LabSolos_Server_DotNet8.Services
{
    public class JwtService(IConfiguration config)
    {
        private readonly string _secret = config["Jwt:Key"]!;
        private readonly string _issuer = config["Jwt:Issuer"]!;
        private readonly string _audience = config["Jwt:Audience"]!;
        private readonly int _expiresInMinutes = int.Parse(config["Jwt:ExpiresInMinutes"]!);

        public string GenerateToken(Usuario usuario)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(
                [
                    new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString(CultureInfo.InvariantCulture)),
                    new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                    new Claim(ClaimTypes.Role, usuario.NivelUsuario.ToString()),
                    new Claim(
                        JwtClaimNames.SessionVersion,
                        usuario.VersaoSessao.ToString(CultureInfo.InvariantCulture)),
                    new Claim(
                        JwtClaimNames.PasswordChangeRequired,
                        usuario.ExigeTrocaSenha ? "true" : "false"),
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

    }

    public static class JwtClaimNames
    {
        public const string SessionVersion = "session_version";
        public const string PasswordChangeRequired = "password_change_required";
    }
}
