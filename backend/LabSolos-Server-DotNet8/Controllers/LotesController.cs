using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoteController : ControllerBase
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ILoteService _loteService;

        public LoteController(ILoteService loteService, IUnitOfWork uow, IMapper mapper)
        {
            _loteService = loteService;
            _uow = uow;
            _mapper = mapper;
        }

        [HttpPost("AddLote")]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> AdicionarLote([FromBody] AddLoteDTO loteDto)
        {
            // Validar os dados do usuário através do serviço
            var resultadoValidacao = _loteService.ValidarEstruturaLote(loteDto);
            if (!resultadoValidacao.Validado)
            {
                return BadRequest(new { Message = resultadoValidacao.Mensagem });
            }

            var lote = _mapper.Map<Lote>(loteDto);

            _uow.LoteRepository.Criar(lote);
            await _uow.CommitAsync();

            return CreatedAtAction(nameof(ObterLotePeloCodigo), new { lote.CodigoLote }, new { Message = "Lote de produtos adicionado com sucesso." });
        }

        [HttpGet("GetById/{id}")]
        [Authorize]
        public async Task<IActionResult> ObterLotePeloId(int id)
        {
            // Busca o lote pelo ID no repositório
            var lote = await _uow.LoteRepository.ObterAsync(l => l.Id == id);

            if (lote == null)
            {
                return NotFound(new { Message = $"Lote com ID {id} não encontrado." });
            }

            return Ok(_mapper.Map<LoteDTO>(lote));
        }

        [HttpGet("GetByCodigo/{codigoLote}")]
        [Authorize]
        public async Task<IActionResult> ObterLotePeloCodigo(string codigoLote)
        {
            var lote = await _uow.LoteRepository.ObterAsync(l => l.CodigoLote == codigoLote);

            if (lote == null)
            {
                return NotFound(new { Message = "Lote não encontrado." });
            }

            return Ok(_mapper.Map<LoteDTO>(lote));
        }
    }
}