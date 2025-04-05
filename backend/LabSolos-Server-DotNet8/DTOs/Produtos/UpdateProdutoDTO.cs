using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class UpdateProdutoDTO
    {
        public int Id { get; set; }
        public string Catmat { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public float Quantidade { get; set; }
        public float QuantidadeMinima { get; set; }
        public string? Fornecedor { get; set; } = string.Empty;
        public string? LocalizacaoProduto { get; set; } = string.Empty;
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public string? Status { get; set; }
    }
}
