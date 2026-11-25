namespace LabSolos_Server_DotNet8.DTOs.Produtos;

public sealed class ProdutoAlertaDTO : ProdutoDTO
{
    public const string MotivoValidade = "validade";
    public const string MotivoEstoqueAbaixoMinimo = "estoque_abaixo_minimo";

    public float? CapacidadeMl { get; set; }
    public IReadOnlyList<string> MotivosAlerta { get; set; } = Array.Empty<string>();
}
