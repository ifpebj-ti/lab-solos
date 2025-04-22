using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class VidrariaDTO
    {
        public int Id { get; set; }
        public string? Catmat { get; set; } = string.Empty;
        public string NomeProduto { get; set; } = string.Empty;
        public string TipoProduto { get; set; } = "Vidraria";
        public string? Fornecedor { get; set; } = string.Empty;
        public float Quantidade { get; set; }
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public float QuantidadeMinima { get; set; }
        public string? LocalizacaoProduto { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? Material { get; set; } = string.Empty;
        public string? Formato { get; set; } = string.Empty;
        public string? Altura { get; set; } = string.Empty;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }
        public LoteDTO? Lote { get; set; }
    }
}
