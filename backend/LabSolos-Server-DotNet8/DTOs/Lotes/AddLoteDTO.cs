namespace LabSolos_Server_DotNet8.DTOs.Lotes
{
    public class AddLoteDTO
    {
        public required string CodigoLote { get; set; }
        public required int QuantidadeLote { get; set; }
        public required string NomeProduto { get; set; }
        public string? Fornecedor { get; set; }
        public string Tipo { get; set; } // Enum
        public required float Quantidade { get; set; }
        public required float QuantidadeMinima { get; set; }
        public required string LocalizacaoProduto { get; set; }
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public string? Catmat { get; set; } = string.Empty;
        public string? UnidadeMedida { get; set; } = string.Empty;
        public string? EstadoFisico { get; set; } = string.Empty;
        public string? Cor { get; set; } = string.Empty;
        public string? Odor { get; set; } = string.Empty;
        public string? FormulaQuimica { get; set; } = string.Empty;
        public float? PesoMolecular { get; set; }
        public float? Densidade { get; set; }
        public string? GrauPureza { get; set; } = string.Empty;
        public string? Grupo { get; set; } = string.Empty;
        public string? Material { get; set; } = string.Empty;
        public string? Formato { get; set; } = string.Empty;
        public string? Altura { get; set; } = string.Empty;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }
    }
}