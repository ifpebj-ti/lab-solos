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
        Task<IEnumerable<object>> GetAllAsync();
        Task<IEnumerable<object>> GetProdutosEmAlerta();
        Task<IEnumerable<object>> GetProdutosByTipoAsync(TipoProduto tipoProduto);
        Task<Produto?> GetByIdAsync(int id);
        Task AddAsync(Produto produto);
        Task UpdateAsync(Produto produto);
        Task DeleteAsync(int id);
        Produto ObterEstruturaProdutoPeloTipo(AddProdutoDTO produtoDTO);
        ResultadoValidacaoDTO ValidarEstruturaLote(AddProdutoDTO produtoDTO);
    }

    public class ProdutoService(IProdutoRepository produtoRepository, IUtilitiesService utilitiesService, ILogger<ProdutoService> logger) : IProdutoService
    {
        private readonly IProdutoRepository _produtoRepository = produtoRepository;
        private readonly IUtilitiesService _utilitiesService = utilitiesService;

        private readonly ILogger<ProdutoService> _logger = logger;

        public async Task<IEnumerable<object>> GetProdutosByTipoAsync(TipoProduto tipoProduto)
        {
            _logger.LogInformation("Iniciando operação para obter produtos do tipo {Tipo}.", tipoProduto);
            var produtos = await _produtoRepository.GetAllAsync();

            switch (tipoProduto)
            {
                case TipoProduto.Quimico:
                    var quimicos = produtos
                        .OfType<Quimico>()
                        .Select(q => new QuimicoDTO
                        {
                            Id = q.Id,
                            NomeProduto = q.NomeProduto,
                            Fornecedor = q.Fornecedor,
                            Quantidade = q.Quantidade,
                            QuantidadeMinima = q.QuantidadeMinima,
                            DataFabricacao = q.DataFabricacao.ToString(),
                            DataValidade = q.DataValidade.ToString(),
                            LocalizacaoProduto = q.LocalizacaoProduto,
                            Status = q.Status.ToString(),
                            Catmat = q.Catmat,
                            UnidadeMedida = q.UnidadeMedida.ToString(),
                            EstadoFisico = q.EstadoFisico.ToString(),
                            Cor = q.Cor.ToString(),
                            Odor = q.Odor.ToString(),
                            FormulaQuimica = q.FormulaQuimica,
                            PesoMolecular = q.PesoMolecular,
                            Densidade = q.Densidade,
                            GrauPureza = q.GrauPureza,
                            Grupo = q.Grupo.ToString(),
                        }).ToList<object>();

                    _logger.LogInformation("{Count} produtos químicos obtidos.", quimicos.Count);
                    return quimicos;

                case TipoProduto.Vidraria:
                    var vidrarias = produtos
                        .OfType<Vidraria>()
                        .Select(v => new VidrariaDTO
                        {
                            Id = v.Id,
                            NomeProduto = v.NomeProduto,
                            Fornecedor = v.Fornecedor,
                            Quantidade = v.Quantidade,
                            DataFabricacao = v.DataFabricacao.ToString(),
                            DataValidade = v.DataValidade.ToString(),
                            QuantidadeMinima = v.QuantidadeMinima,
                            LocalizacaoProduto = v.LocalizacaoProduto,
                            Status = v.Status.ToString(),
                            Material = v.Material.ToString(),
                            Formato = v.Formato.ToString(),
                            Altura = v.Altura.ToString(),
                            Capacidade = v.Capacidade,
                            Graduada = v.Graduada,
                        }).ToList<object>();

                    _logger.LogInformation("{Count} vidrarias obtidas.", vidrarias.Count);
                    return vidrarias;

                case TipoProduto.Outro:
                    var outros = produtos.Where(p => p.Tipo == tipoProduto)
                    .Select(o => new ProdutoDTO
                    {
                        Id = o.Id,
                        NomeProduto = o.NomeProduto,
                        Fornecedor = o.Fornecedor,
                        Quantidade = o.Quantidade,
                        DataFabricacao = o.DataFabricacao.ToString(),
                        DataValidade = o.DataValidade.ToString(),
                        QuantidadeMinima = o.QuantidadeMinima,
                        LocalizacaoProduto = o.LocalizacaoProduto,
                        Status = o.Status.ToString(),
                    })
                    .ToList<object>();

                    _logger.LogInformation("{Count} Outros obtidos.", outros.Count);
                    return outros;

                default:
                    _logger.LogWarning("Tipo de produto especificado ({Tipo}) ainda não tem implementação.", tipoProduto);
                    throw new NotImplementedException("Tipo de produto não implementado.");
            }
        }
        public async Task<IEnumerable<object>> GetAllAsync()
        {
            var produtos = await _produtoRepository.GetAllAsync();

            return produtos.Select(o => new ProdutoDTO
            {
                Id = o.Id,
                NomeProduto = o.NomeProduto,
                Fornecedor = o.Fornecedor,
                Quantidade = o.Quantidade,
                DataFabricacao = o.DataFabricacao.ToString(),
                DataValidade = o.DataValidade.ToString(),
                QuantidadeMinima = o.QuantidadeMinima,
                LocalizacaoProduto = o.LocalizacaoProduto,
                Status = o.Status.ToString(),
            });
        }

        public async Task<IEnumerable<object>> GetProdutosEmAlerta()
        {
            var produtos = await _produtoRepository.GetProdutosEmAlerta();

            return produtos.Select(o => new ProdutoDTO
            {
                Id = o.Id,
                NomeProduto = o.NomeProduto,
                Fornecedor = o.Fornecedor,
                Quantidade = o.Quantidade,
                DataFabricacao = o.DataFabricacao.ToString(),
                DataValidade = o.DataValidade.ToString(),
                QuantidadeMinima = o.QuantidadeMinima,
                LocalizacaoProduto = o.LocalizacaoProduto,
                Status = o.Status.ToString(),
            });
        }

        public async Task<Produto?> GetByIdAsync(int id)
        {
            return await _produtoRepository.GetByIdAsync(id);
        }

        public async Task AddAsync(Produto produto)
        {
            await _produtoRepository.AddAsync(produto);
        }

        public async Task UpdateAsync(Produto produto)
        {
            await _produtoRepository.UpdateAsync(produto);
        }

        public async Task DeleteAsync(int id)
        {
            await _produtoRepository.DeleteAsync(id);
        }

        public Produto ObterEstruturaProdutoPeloTipo(AddProdutoDTO produtoDTO)
        {
            Produto produto = produtoDTO.Tipo switch
            {
                "Quimico" => new Quimico
                {
                    NomeProduto = produtoDTO.NomeProduto,
                    Fornecedor = produtoDTO.Fornecedor,
                    Tipo = TipoProduto.Quimico,
                    Quantidade = produtoDTO.Quantidade,
                    QuantidadeMinima = produtoDTO.QuantidadeMinima,
                    LocalizacaoProduto = produtoDTO.LocalizacaoProduto,
                    DataFabricacao = _utilitiesService.ConverterParaDateTime(produtoDTO.DataFabricacao),
                    DataValidade = _utilitiesService.ConverterParaDateTime(produtoDTO.DataValidade),
                    Status = StatusProduto.Disponivel,
                    Catmat = produtoDTO.Catmat,
                    UnidadeMedida = _utilitiesService.ValidarEnum(produtoDTO.UnidadeMedida, nameof(produtoDTO.UnidadeMedida), UnidadeMedida.Indefinido),
                    EstadoFisico = _utilitiesService.ValidarEnum(produtoDTO.EstadoFisico, nameof(produtoDTO.EstadoFisico), EstadoFisico.Indefinido),
                    Cor = _utilitiesService.ValidarEnum(produtoDTO.Cor, nameof(produtoDTO.Cor), Cor.Indefinido),
                    Odor = _utilitiesService.ValidarEnum(produtoDTO.Odor, nameof(produtoDTO.Odor), Odor.Indefinido),
                    PesoMolecular = produtoDTO.PesoMolecular,
                    GrauPureza = produtoDTO.GrauPureza,
                    FormulaQuimica = produtoDTO.FormulaQuimica,
                    Grupo = _utilitiesService.ValidarEnum(produtoDTO.Grupo, nameof(produtoDTO.Grupo), Grupo.Indefinido)
                },
                "Vidraria" => new Vidraria
                {
                    NomeProduto = produtoDTO.NomeProduto,
                    Fornecedor = produtoDTO.Fornecedor,
                    Tipo = TipoProduto.Vidraria,
                    Quantidade = produtoDTO.Quantidade,
                    QuantidadeMinima = produtoDTO.QuantidadeMinima,
                    LocalizacaoProduto = produtoDTO.LocalizacaoProduto,
                    DataFabricacao = _utilitiesService.ConverterParaDateTime(produtoDTO.DataFabricacao),
                    DataValidade = _utilitiesService.ConverterParaDateTime(produtoDTO.DataValidade),
                    Status = StatusProduto.Disponivel,
                    Material = _utilitiesService.ValidarEnum(produtoDTO.Material, nameof(produtoDTO.Material), MaterialVidraria.Indefinido),
                    Formato = _utilitiesService.ValidarEnum(produtoDTO.Formato, nameof(produtoDTO.Formato), FormatoVidraria.Indefinido),
                    Altura = _utilitiesService.ValidarEnum(produtoDTO.Altura, nameof(produtoDTO.Altura), AlturaVidraria.Indefinido),
                    Capacidade = produtoDTO.Capacidade,
                    Graduada = produtoDTO.Graduada ?? null
                },
                "Outro" => new Produto
                {
                    NomeProduto = produtoDTO.NomeProduto,
                    Fornecedor = produtoDTO.Fornecedor,
                    Tipo = TipoProduto.Outro,
                    Quantidade = produtoDTO.Quantidade,
                    QuantidadeMinima = produtoDTO.QuantidadeMinima,
                    DataFabricacao = _utilitiesService.ConverterParaDateTime(produtoDTO.DataFabricacao),
                    DataValidade = _utilitiesService.ConverterParaDateTime(produtoDTO.DataValidade),
                    LocalizacaoProduto = produtoDTO.LocalizacaoProduto,
                    Status = StatusProduto.Disponivel,
                    UltimaModificacao = DateTime.Now,
                },
                _ => throw new InvalidOperationException("O tipo fornecido não é suportado.")
            };

            return produto;
        }

        public ResultadoValidacaoDTO ValidarEstruturaLote(AddProdutoDTO produtoDTO)
        {
            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == "Quimico" && (
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
            if (produtoDTO.Tipo == "Vidraria" && (
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