using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailService _emailService;

    public EmailController(IEmailService emailService)
    {
        _emailService = emailService;
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
}
