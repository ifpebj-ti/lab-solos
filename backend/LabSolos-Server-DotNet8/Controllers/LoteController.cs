using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoteController(AppDbContext context, ILoteService loteService) : ControllerBase
    {
        private readonly AppDbContext _context = context;
        private readonly ILoteService _loteService = loteService;

        [HttpPost("AddLote")]
        public async Task<IActionResult> AddLote([FromBody] AddLoteDTO loteDto)
        {
            try
            {
                // Validar os dados do usuário através do serviço
                var resultadoValidacao = _loteService.ValidarEstruturaLote(loteDto);
                if (!resultadoValidacao.Validado)
                {
                    return BadRequest(new { Message = resultadoValidacao.Mensagem });
                }

                string codigoLote = loteDto.CodigoLote;

                for (int i = 0; i < loteDto.QuantidadeLote; i++)
                {
                    // Criar o produto com base no tipo
                    var produto = _loteService.AddProdutoPorTipo(loteDto);

                    // Adicionar ao lote
                    await _loteService.AddLoteProdutosAsync(produto, codigoLote);
                }

                return CreatedAtAction(nameof(GetByCodigo), new { codigoLote }, new { Message = "Lote criado com sucesso." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Ocorreu um erro inesperado.", Details = ex.Message });
            }
        }

        [HttpGet("GetById/{id}")]
        public async Task<IActionResult> GetLoteById(int id)
        {
            try
            {
                // Busca o lote pelo ID no repositório
                var lote = await _loteService.GetLoteByIdAsync(id);

                if (lote == null)
                {
                    return NotFound(new { Message = $"Lote com ID {id} não encontrado." });
                }

                return Ok(lote);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Ocorreu um erro ao processar sua solicitação.", Details = ex.Message });
            }
        }

        [HttpGet("GetByCodigo/{codigoLote}")]
        public async Task<IActionResult> GetByCodigo(string codigoLote)
        {
            try
            {
                var lote = await _loteService.GetLoteByCodigoAsync(codigoLote);

                if (lote == null)
                {
                    return NotFound(new { Message = "Lote não encontrado." });
                }

                return Ok(lote);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Ocorreu um erro inesperado.", Details = ex.Message });
            }
        }

    }
}