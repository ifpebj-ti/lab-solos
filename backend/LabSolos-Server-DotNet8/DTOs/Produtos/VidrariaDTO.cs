namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class VidrariaDTO
    {
        public int Id { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public string? Fornecedor { get; set; } = string.Empty;
        public float Quantidade { get; set; }
        public float QuantidadeMinima { get; set; }
        public string? LocalizacaoProduto { get; set; } = string.Empty;
        public string? Material { get; set; } = string.Empty;
        public string? Formato { get; set; } = string.Empty;
        public string? Altura { get; set; } = string.Empty;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }
    }
}
