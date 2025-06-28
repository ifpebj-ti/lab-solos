namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class HistoricoSaidaProdutoDTO
    {
        public int EmprestimoId { get; set; }
        public DateTime DataEmprestimo { get; set; }
        public DateTime? DataDevolucao { get; set; }
        public int QuantidadeEmprestada { get; set; }
        public string StatusEmprestimo { get; set; } = string.Empty;
        public UsuarioEmprestimoDTO Solicitante { get; set; } = new();
        public UsuarioEmprestimoDTO? Aprovador { get; set; }
        public string? Identificador { get; set; }
        public string? Lote { get; set; }
    }

    public class UsuarioEmprestimoDTO
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Instituicao { get; set; }
    }

    public class HistoricoSaidaProdutoResponseDTO
    {
        public int ProdutoId { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public string TipoProduto { get; set; } = string.Empty;
        public float EstoqueAtual { get; set; }
        public string UnidadeMedida { get; set; } = string.Empty;
        public List<HistoricoSaidaProdutoDTO> Historico { get; set; } = new();
        public int TotalEmprestimos { get; set; }
        public float TotalQuantidadeEmprestada { get; set; }
    }
}
