namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class QuimicoDTO
    {
        public int Id { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public string? Fornecedor { get; set; } = string.Empty;
        public float Quantidade { get; set; }
        public float QuantidadeMinima { get; set; }
        public DateTime? DataValidade { get; set; }
        public string? LocalizacaoProduto { get; set; } = string.Empty;
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
    }
}
