using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.Services
{
    public interface ILoteService
    {
        ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto);
    }

    public class LoteService(ILogger<LoteService> logger) : ILoteService
    {
        private readonly ILogger<LoteService> _logger = logger;

        public ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto)
        {
            // Verificar se o tipo corresponde aos atributos fornecidos
            if (loteDto.Tipo == "Quimico" && (
                string.IsNullOrEmpty(loteDto.DataValidade) ||
                string.IsNullOrEmpty(loteDto.UnidadeMedida) ||
                string.IsNullOrEmpty(loteDto.FormulaQuimica)))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Quimico', os campos 'DataValidade', 'UnidadeMedida' e 'FormulaQuimica' são obrigatórios"
                };
            }

            // Verificar se o tipo corresponde aos atributos fornecidos
            if (loteDto.Tipo == "Vidraria" && (
                !loteDto.Capacidade.HasValue))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Vidraria', o campo 'Capacidade' é obrigatório"
                };
            }


            // Se todas as validações passarem
            return new ResultadoValidacaoDTO
            {
                Validado = true,
                Mensagem = string.Empty
            };
        }
    }
}
