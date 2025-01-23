using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class AddProdutoDTO
    {
        public string NomeProduto { get; set; } = string.Empty;
        public string TipoProduto { get; set; } = string.Empty;
        public string? Fornecedor { get; set; } = string.Empty;
        public string? DataFabricacao { get; set; } = string.Empty;
        public float Quantidade { get; set; }
        public float QuantidadeMinima { get; set; }
        public string? LocalizacaoProduto { get; set; } = string.Empty;
        public string? DataValidade { get; set; }
        public string? Catmat { get; set; } = string.Empty;
        public int UnidadeMedida { get; set; } = (int) Enums.UnidadeMedida.Indefinido;
        public int EstadoFisico { get; set; } = (int) Enums.EstadoFisico.Indefinido;
        public int Cor { get; set; } = (int) Enums.Cor.Indefinido;
        public int Odor { get; set; } = (int) Enums.Odor.Indefinido;
        public string? FormulaQuimica { get; set; } = string.Empty;
        public float? PesoMolecular { get; set; }
        public float? Densidade { get; set; }
        public string? GrauPureza { get; set; } = string.Empty;
        public int Grupo { get; set; } = (int) Enums.Grupo.Indefinido;
        public int Material { get; set; } = (int) MaterialVidraria.Indefinido;
        public int Formato { get; set; } = (int) FormatoVidraria.Indefinido;
        public int Altura { get; set; } = (int) AlturaVidraria.Indefinido;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }
    }
}
