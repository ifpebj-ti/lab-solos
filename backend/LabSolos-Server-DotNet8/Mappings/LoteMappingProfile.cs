using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;

namespace Core.DTOs.Mappings
{
    public class LoteMappingProfile : Profile
    {
        public LoteMappingProfile(IUtilitiesService utilitiesService)
        {
            CreateMap<AddLoteDTO, Lote>()
                .AfterMap((src, dest) =>
                {
                    dest.Produtos = GerarProdutosLote(src, utilitiesService);
                });
        }

        private List<Produto> GerarProdutosLote(AddLoteDTO loteDto, IUtilitiesService utilitiesService)
        {
            List<Produto> produtos = new List<Produto>();

            for (int i = 0; i < loteDto.QuantidadeLote; i++)
            {
                Produto produto = loteDto.Tipo switch
                {
                    "Quimico" => new Quimico
                    {
                        NomeProduto = loteDto.NomeProduto,
                        Fornecedor = loteDto.Fornecedor,
                        Tipo = TipoProduto.Quimico,
                        Quantidade = loteDto.Quantidade,
                        QuantidadeMinima = loteDto.QuantidadeMinima,
                        LocalizacaoProduto = loteDto.LocalizacaoProduto,
                        DataFabricacao = utilitiesService.ConverterParaDateTime(loteDto.DataFabricacao),
                        DataValidade = utilitiesService.ConverterParaDateTime(loteDto.DataValidade),
                        Status = StatusProduto.Disponivel,
                        Catmat = loteDto.Catmat,
                        UnidadeMedida = utilitiesService.ValidarEnum(loteDto.UnidadeMedida, nameof(loteDto.UnidadeMedida), UnidadeMedida.Indefinido),
                        EstadoFisico = utilitiesService.ValidarEnum(loteDto.EstadoFisico, nameof(loteDto.EstadoFisico), EstadoFisico.Indefinido),
                        Cor = utilitiesService.ValidarEnum(loteDto.Cor, nameof(loteDto.Cor), Cor.Indefinido),
                        Odor = utilitiesService.ValidarEnum(loteDto.Odor, nameof(loteDto.Odor), Odor.Indefinido),
                        PesoMolecular = loteDto.PesoMolecular,
                        GrauPureza = loteDto.GrauPureza,
                        FormulaQuimica = loteDto.FormulaQuimica,
                        Grupo = utilitiesService.ValidarEnum(loteDto.Grupo, nameof(loteDto.Grupo), Grupo.Indefinido)
                    },

                    "Vidraria" => new Vidraria
                    {
                        NomeProduto = loteDto.NomeProduto,
                        Fornecedor = loteDto.Fornecedor,
                        Tipo = TipoProduto.Vidraria,
                        Quantidade = loteDto.Quantidade,
                        QuantidadeMinima = loteDto.QuantidadeMinima,
                        LocalizacaoProduto = loteDto.LocalizacaoProduto,
                        DataFabricacao = utilitiesService.ConverterParaDateTime(loteDto.DataFabricacao),
                        DataValidade = utilitiesService.ConverterParaDateTime(loteDto.DataValidade),
                        Status = StatusProduto.Disponivel,
                        Material = utilitiesService.ValidarEnum(loteDto.Material, nameof(loteDto.Material), MaterialVidraria.Indefinido),
                        Formato = utilitiesService.ValidarEnum(loteDto.Formato, nameof(loteDto.Formato), FormatoVidraria.Indefinido),
                        Altura = utilitiesService.ValidarEnum(loteDto.Altura, nameof(loteDto.Altura), AlturaVidraria.Indefinido),
                        Capacidade = loteDto.Capacidade,
                        Graduada = loteDto.Graduada,
                    },

                    "Outro" => new Produto
                    {
                        NomeProduto = loteDto.NomeProduto,
                        Fornecedor = loteDto.Fornecedor,
                        Tipo = TipoProduto.Outro,
                        Quantidade = loteDto.Quantidade,
                        QuantidadeMinima = loteDto.QuantidadeMinima,
                        DataFabricacao = utilitiesService.ConverterParaDateTime(loteDto.DataFabricacao),
                        DataValidade = utilitiesService.ConverterParaDateTime(loteDto.DataValidade),
                        LocalizacaoProduto = loteDto.LocalizacaoProduto,
                        Status = StatusProduto.Disponivel,
                        UltimaModificacao = DateTime.Now,
                    },

                    _ => throw new InvalidOperationException("O tipo fornecido não é suportado.")
                };

                // Adiciona o produto gerado à lista
                produtos.Add(produto);
            }

            return produtos;
        }
    }
}
