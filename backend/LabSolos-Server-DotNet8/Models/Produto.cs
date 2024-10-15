using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public abstract class Produto
    {
        public int Id { get; set; }
        public required string NomeProduto { get; set; }
        public string? Fornecedor { get; set; }
        public TipoProduto Tipo { get; set; } // Enum
        public required double Quantidade { get; set; }
        public required double QuantidadeMinima { get; set; }
        public DateTime? DataFabricacao{ get; set; }
        public DateTime? DataValidade { get; set; }
        public required string LocalizacaoProduto { get; set; }
        public required StatusProduto Status { get; set; }
        public DateTime UltimaModificacao { get; set; } // Decidir

        public int? LoteId { get; set; }  
        public Lote? Lote { get; set; } 
    }
}