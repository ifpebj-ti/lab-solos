namespace LabSolos_Server_DotNet8.Models;

public enum TipoMovimentacaoEstoque
{
    SaidaEmprestimo,
    DevolucaoEmprestimo
}

public sealed class MovimentacaoEstoque
{
    public int Id { get; set; }
    public required int EmprestimoId { get; set; }
    public Emprestimo Emprestimo { get; set; } = null!;
    public required int ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    public required int Quantidade { get; set; }
    public required DateTime Instante { get; set; }
    public required int AtorId { get; set; }
    public Usuario Ator { get; set; } = null!;
    public int? LoteId { get; set; }
    public Lote? Lote { get; set; }
    public required TipoMovimentacaoEstoque Tipo { get; set; }
}
