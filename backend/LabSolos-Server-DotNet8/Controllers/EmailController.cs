using LabSolos_Server_DotNet8.DTOs.Email;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly IUnitOfWork _uow;
        private readonly JwtService _jwtService;


        public EmailController(IEmailService emailService, IUnitOfWork uow, JwtService jwtService)        
        {
            _jwtService = jwtService;
            _emailService = emailService;
            _uow = uow;
        }

        [HttpPost("enviar")]
        public IActionResult EnviarEmail([FromQuery] string para)
        {
            try
            {
                _emailService.EnviarEmail(
                    para: para,
                    assunto: "Teste de E-mail",
                    corpo: "Este é um e-mail de teste enviado pelo sistema."
                );

                return Ok("E-mail enviado com sucesso!");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro ao enviar o e-mail: {ex.Message}");
            }
        }

        [HttpPost("solicitar-redefinicao")]
        public async Task<IActionResult> SolicitarRedefinicao([FromBody] EmailDTO emailDto)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Email == emailDto.Email);
            if (usuario == null || usuario.Status != StatusUsuario.Habilitado)
                return NotFound("Usuário não encontrado ou não está habilitado.");

            var random = new Random();
            var token = random.Next(100000, 999999).ToString(); 

            // Salvar o token e a expiração no banco
            usuario.TokenRedefinicao = token;
            usuario.TokenExpiracao = DateTime.UtcNow.AddMinutes(1);

            _uow.UsuarioRepository.Atualizar(usuario);
            await _uow.CommitAsync();

            var primeiroNome = usuario.NomeCompleto.Split(" ").First();

            var corpoEmail = $@"
            <html>
            <body style=""font-family: Arial, sans-serif; color: #333;"">
                <h2 style=""color: #2c3e50;"">Olá, {primeiroNome}!</h2>
                <p>Use o código abaixo para redefinir sua senha:</p>
                <div style=""font-size: 24px; font-weight: bold; margin: 20px 0; color: #2c3e50;"">
                {token}
                </div>
                <p style=""font-size: 14px; color: #777;"">
                Caso você não tenha solicitado essa redefinição, ignore este e-mail.
                </p>
            </body>
            </html>";

            _emailService.EnviarEmail(
                para: emailDto.Email,
                assunto: "Redefinição de Senha",
                corpo: corpoEmail
            );

            return Ok("Instruções enviadas para seu e-mail.");
        }

        [HttpPost("redefinir-senha")]
        public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaDTO dto)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.TokenRedefinicao == dto.Token);
            if (usuario == null || usuario.TokenExpiracao < DateTime.UtcNow)
                return BadRequest("Token inválido ou expirado.");

            usuario.SenhaHash = JwtService.HashPassword(usuario, dto.NovaSenha);
            usuario.TokenRedefinicao = null;
            usuario.TokenExpiracao = null;

            _uow.UsuarioRepository.Atualizar(usuario);
            await _uow.CommitAsync();

            return Ok("Senha redefinida com sucesso.");
        }


    }
}