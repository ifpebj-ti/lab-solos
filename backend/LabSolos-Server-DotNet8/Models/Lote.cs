namespace LabSolos_Server_DotNet8.Models
{
    public class Lote
    {
        public int Id { get; set; }
        public required string CodigoLote { get; set; }
        public string? Fornecedor { get; set; }
        public DateTime? DataFabricacao { get; set; }
        public DateTime? DataValidade { get; set; }
        public DateTime? DataEntrada { get; set; }
        public List<Produto>? Produtos { get; set; }
    }
}
