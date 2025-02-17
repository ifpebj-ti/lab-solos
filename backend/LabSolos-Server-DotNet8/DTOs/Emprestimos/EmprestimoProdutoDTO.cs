using LabSolos_Server_DotNet8.DTOs.Produtos;

namespace LabSolos_Server_DotNet8.DTOs.Emprestimos
{
    public class EmprestimoProdutoDTO
    {
        public int Id { get; set; }
        public int EmprestimoId { get; set; }
        public int ProdutoId { get; set; }
        public ProdutoDTO Produto { get; set; } = null!;
        public int Quantidade { get; set; }
    }
}