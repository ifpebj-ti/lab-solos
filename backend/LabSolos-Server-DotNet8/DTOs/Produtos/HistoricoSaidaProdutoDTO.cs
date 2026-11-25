namespace LabSolos_Server_DotNet8.DTOs.Produtos;

public sealed class HistoricoSaidaProdutoDTO
{
    public int EmprestimoId { get; set; }
    public DateTime DataSaida { get; set; }
    public int QuantidadeEmprestada { get; set; }
    public string UnidadeMedida { get; set; } = string.Empty;
    public string? Lote { get; set; }
    public string? SolicitanteNome { get; set; }
}

public sealed class HistoricoSaidaProdutoResponseDTO
{
    public int ProdutoId { get; set; }
    public string NomeProduto { get; set; } = string.Empty;
    public string TipoProduto { get; set; } = string.Empty;
    public string UnidadeMedida { get; set; } = string.Empty;
    public List<HistoricoSaidaProdutoDTO> Historico { get; set; } = [];
    public int TotalEmprestimos { get; set; }
    public decimal TotalQuantidadeEmprestada { get; set; }
}
