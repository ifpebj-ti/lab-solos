using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IProdutoService
    {
        ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO);
    }

    public class ProdutoService(ILogger<ProdutoService> logger) : IProdutoService
    {
        private readonly ILogger<ProdutoService> _logger = logger;

        public ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO)
        {
            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Quimico.ToString() && (
                string.IsNullOrEmpty(produtoDTO.DataValidade) ||
                string.IsNullOrEmpty(produtoDTO.UnidadeMedida) ||
                string.IsNullOrEmpty(produtoDTO.FormulaQuimica)))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Quimico', os campos 'DataValidade', 'UnidadeMedida' e 'FormulaQuimica' são obrigatórios"
                };
            }

            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Vidraria.ToString() && (
                !produtoDTO.Capacidade.HasValue))
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