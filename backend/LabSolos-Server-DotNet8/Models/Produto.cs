using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public abstract class Produto
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Lote { get; set; }
        public TipoProduto Tipo { get; set; }  // Enum
        public double Quantidade { get; set; }
        public double QuantidadeMinima { get; set; }
        public DateTime DataValidade { get; set; }
        public string LocalizacaoProduto { get; set; }
        public string Marca { get; set; }
        public bool Status { get; set; }
        public DateTime UltimaModificacao { get; set; }
    }
}
