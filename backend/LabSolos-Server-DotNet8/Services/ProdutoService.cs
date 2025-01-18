using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public class ProdutoService(IProdutoRepository produtoRepository, ILogger<ProdutoService> logger) : IProdutoService
    {
        private readonly IProdutoRepository _produtoRepository = produtoRepository;
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
                            DataValidade = q.DataValidade.ToString(),
                            LocalizacaoProduto = q.LocalizacaoProduto,
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
                            QuantidadeMinima = v.QuantidadeMinima,
                            LocalizacaoProduto = v.LocalizacaoProduto,
                            Material = v.Material.ToString(),
                            Formato = v.Formato.ToString(),
                            Altura = v.Altura.ToString(),
                            Capacidade = v.Capacidade,
                            Graduada = v.Graduada,
                        }).ToList<object>();

                    _logger.LogInformation("{Count} vidrarias obtidas.", vidrarias.Count);
                    return vidrarias;

                default:
                    _logger.LogWarning("Tipo de produto especificado ({Tipo}) ainda não tem implementação.", tipoProduto);
                    throw new NotImplementedException("Tipo de produto não implementado.");
            }
        }
        public async Task<IEnumerable<object>> GetAllAsync()
        {
            return await _produtoRepository.GetAllAsync();
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
    }
}