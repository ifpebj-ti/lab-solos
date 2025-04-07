using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.DTOs.Lotes
{
    public class LoteDTO
    {
        public required string CodigoLote { get; set; }
        public string? Fornecedor { get; set; }
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public List<ProdutoDTO> Produtos { get; set; }
    }
}