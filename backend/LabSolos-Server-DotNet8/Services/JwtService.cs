using System.IdentityModel.Tokens.Jwt;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using LabSolos_Server_DotNet8.Models;
using Microsoft.IdentityModel.Tokens;

namespace LabSolos_Server_DotNet8.Services
{
    public class JwtService
    {
        private readonly SigningCredentials _signingCredentials;
        private readonly string? _issuer;
        private readonly string? _audience;
        private readonly TimeSpan _lifetime;

        public JwtService(IConfiguration config)
        {
            var jwtSettings = config.GetSection("Jwt");
            var key = jwtSettings["Key"];
            if (string.IsNullOrEmpty(key))
            {
                throw new InvalidOperationException(
                    "Chave JWT ausente. Verifique suas variáveis de ambiente ou o arquivo appsettings.json.");
            }

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            _signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256Signature);
            _issuer = jwtSettings["Issuer"];
            _audience = jwtSettings["Audience"];
            _lifetime = TimeSpan.FromMinutes(int.Parse(jwtSettings["ExpiresInMinutes"]!, CultureInfo.InvariantCulture));
        }

        public string GenerateToken(Usuario usuario)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var issuedAt = DateTime.UtcNow;
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
                IssuedAt = issuedAt,
                NotBefore = issuedAt,
                Expires = issuedAt.Add(_lifetime),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = _signingCredentials
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        internal TokenValidationParameters CreateValidationParameters() => new()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _issuer,
            ValidAudience = _audience,
            IssuerSigningKey = _signingCredentials.Key,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role
        };
    }

    public static class JwtClaimNames
    {
        public const string SessionVersion = "session_version";
        public const string PasswordChangeRequired = "password_change_required";
    }
}
