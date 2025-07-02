namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class ProdutoDTOPatchRequest
    {
        public string? Catmat { get; set; }
        public string? NomeProduto { get; set; }
        public float? Quantidade { get; set; }
        public float? QuantidadeMinima { get; set; }
        public string? Fornecedor { get; set; }
        public string? LocalizacaoProduto { get; set; }
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public string? Status { get; set; }
    }
}
