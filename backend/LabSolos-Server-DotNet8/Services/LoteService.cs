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
        // Task<IEnumerable<Lote>> GetAllAsync();
        // Task<Lote?> GetByIdAsync(int id);
        // Task UpdateAsync(Lote lote);
        // Task DeleteAsync(int id);


        ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto);
        Task AddLoteProdutosAsync(Produto produto, string codigoLote);
        Task<Lote?> GetLoteByIdAsync(int id);
        Task<Lote?> GetLoteByCodigoAsync(string codigoLote);
        Produto AddProdutoPorTipo(AddLoteDTO loteDto);
    }
    
    public class LoteService(ILoteRepository loteRepository, IProdutoRepository produtoRepository, IUtilitiesService utilitiesService, ILogger<LoteService> logger) : ILoteService
    {
        private readonly ILoteRepository _loteRepository = loteRepository;
        private readonly IProdutoRepository _produtoRepository = produtoRepository;
        private readonly IUtilitiesService _utilitiesService = utilitiesService;
        private readonly ILogger<LoteService> _logger = logger;

        public async Task AddLoteProdutosAsync(Produto produto, string codigoLote)
        {
            // Verifica se já existe um lote com o código fornecido
            var loteExistente = await _loteRepository.GetLoteByCodigoAsync(codigoLote);

            if (loteExistente != null)
            {
                // Se o lote já existir, adiciona o produto a esse lote
                produto.LoteId = loteExistente.Id;
                await _produtoRepository.AddAsync(produto);
            }
            else
            {
                // Se o lote não existir, cria um novo lote e associa o produto a ele
                var novoLote = new Lote
                {
                    CodigoLote = codigoLote.ToString(),
                    DataEntrada = DateTime.UtcNow // Você pode ajustar a data conforme necessário
                };

                // Cria o novo lote
                var loteCriado = await _loteRepository.AddLoteAsync(novoLote);

                // Associa o produto ao novo lote
                produto.LoteId = loteCriado.Id;
                await _produtoRepository.AddAsync(produto);

            }
        }

        public async Task<Lote?> GetLoteByIdAsync(int id)
        {
            return await _loteRepository.GetLoteByIdAsync(id);
        }

        public async Task<Lote?> GetLoteByCodigoAsync(string codigoLote)
        {
            return await _loteRepository.GetLoteByCodigoAsync(codigoLote);
        }

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

        public Produto AddProdutoPorTipo(AddLoteDTO loteDto)
        {
            return loteDto.Tipo switch
            {
                "Quimico" => new Quimico
                {
                    NomeProduto = loteDto.NomeProduto,
                    Fornecedor = loteDto.Fornecedor,
                    Tipo = TipoProduto.Quimico,
                    Quantidade = loteDto.Quantidade,
                    QuantidadeMinima = loteDto.QuantidadeMinima,
                    LocalizacaoProduto = loteDto.LocalizacaoProduto,
                    DataFabricacao = _utilitiesService.ConverterParaDateTime(loteDto.DataFabricacao),
                    DataValidade = _utilitiesService.ConverterParaDateTime(loteDto.DataValidade),
                    Status = StatusProduto.Disponivel,
                    Catmat = loteDto.Catmat,
                    UnidadeMedida = _utilitiesService.ValidarEnum(loteDto.UnidadeMedida, nameof(loteDto.UnidadeMedida), UnidadeMedida.Indefinido),
                    EstadoFisico = _utilitiesService.ValidarEnum(loteDto.EstadoFisico, nameof(loteDto.EstadoFisico), EstadoFisico.Indefinido),
                    Cor = _utilitiesService.ValidarEnum(loteDto.Cor, nameof(loteDto.Cor), Cor.Indefinido),
                    Odor = _utilitiesService.ValidarEnum(loteDto.Odor, nameof(loteDto.Odor), Odor.Indefinido),
                    PesoMolecular = loteDto.PesoMolecular,
                    GrauPureza = loteDto.GrauPureza,
                    FormulaQuimica = loteDto.FormulaQuimica,
                    Grupo = _utilitiesService.ValidarEnum(loteDto.Grupo, nameof(loteDto.Grupo), Grupo.Indefinido)
                },
                "Vidraria" => new Vidraria
                {
                    NomeProduto = loteDto.NomeProduto,
                    Fornecedor = loteDto.Fornecedor,
                    Tipo = TipoProduto.Quimico,
                    Quantidade = loteDto.Quantidade,
                    QuantidadeMinima = loteDto.QuantidadeMinima,
                    LocalizacaoProduto = loteDto.LocalizacaoProduto,
                    DataFabricacao = _utilitiesService.ConverterParaDateTime(loteDto.DataFabricacao),
                    DataValidade = _utilitiesService.ConverterParaDateTime(loteDto.DataValidade),
                    Status = StatusProduto.Disponivel,
                    Material = _utilitiesService.ValidarEnum(loteDto.Material, nameof(loteDto.Material), MaterialVidraria.Indefinido),
                    Formato = _utilitiesService.ValidarEnum(loteDto.Formato, nameof(loteDto.Formato), FormatoVidraria.Indefinido),
                    Altura = _utilitiesService.ValidarEnum(loteDto.Altura, nameof(loteDto.Altura), AlturaVidraria.Indefinido),
                    Capacidade = loteDto.Capacidade,
                    Graduada = loteDto.Graduada,
                },
                _ => throw new InvalidOperationException("O tipo fornecido não é suportado.")
            };
        }
    }
}
