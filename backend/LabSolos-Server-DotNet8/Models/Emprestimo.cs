using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Emprestimo
    {
        public int Id { get; set; }
        public required DateTime DataRealizacao { get; set; }
        public DateTime? DataDevolucao { get; set; }
        public DateTime? DataAprovacao { get; set; }
        public required StatusEmprestimo Status { get; set; }

        public List<EmprestimoProduto> EmprestimoProdutos { get; set; } = new();

        // Referência ao Solicitante do empréstimo (sempre obrigatório)
        public required int SolicitanteId { get; set; }
        public Usuario Solicitante { get; set; } = null!; // Solicitante do empréstimo

        // Referência ao Aprovador, se necessário
        public int? AprovadorId { get; set; }
        public Usuario? Aprovador { get; set; } // Aprovador do empréstimo        
    }
}
