using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.DTOs.Emprestimos
{
    public class EmprestimoDTO
    {
        public int Id { get; set; }
        public DateTime DataRealizacao { get; set; }
        public DateTime? DataDevolucao { get; set; }
        public DateTime? DataAprovacao { get; set; }
        public string Status { get; set; } = string.Empty;

        public List<EmprestimoProdutoDTO> EmprestimoProdutos { get; set; } = new();

        public UsuarioDTO? Solicitante { get; set; }

        public UsuarioDTO? Aprovador { get; set; }

        
        }
}