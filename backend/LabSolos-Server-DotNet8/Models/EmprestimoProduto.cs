using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Models
{
    public class EmprestimoProduto
    {
        public int Id { get; set; }
        public int EmprestimoId { get; set; }
        public Emprestimo Emprestimo { get; set; }

        public int ProdutoId { get; set; }
        public Produto Produto { get; set; }

        public int Quantidade { get; set; }
    }
}
