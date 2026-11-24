using System.Reflection;
using LabSolos_Server_DotNet8.DTOs.Produtos;

namespace Tests.Contracts;

public sealed class ProductHistoryPrivacyTests
{
    [Fact]
    public void HistoryResponseDeclaresOnlyProductIdentityAndScopedTotals()
    {
        AssertPropertyNames<HistoricoSaidaProdutoResponseDTO>(
        [
            "ProdutoId",
            "NomeProduto",
            "TipoProduto",
            "UnidadeMedida",
            "Historico",
            "TotalEmprestimos",
            "TotalQuantidadeEmprestada"
        ]);
    }

    [Fact]
    public void HistoryLineDeclaresOnlyEffectiveOutflowFieldsAndOptionalRequesterName()
    {
        AssertPropertyNames<HistoricoSaidaProdutoDTO>(
        [
            "EmprestimoId",
            "DataSaida",
            "QuantidadeEmprestada",
            "UnidadeMedida",
            "Lote",
            "SolicitanteNome"
        ]);

        var historyProperty = typeof(HistoricoSaidaProdutoResponseDTO)
            .GetProperty("Historico", BindingFlags.Instance | BindingFlags.Public);
        Assert.NotNull(historyProperty);
        Assert.Equal(typeof(List<HistoricoSaidaProdutoDTO>), historyProperty.PropertyType);
    }

    private static void AssertPropertyNames<T>(IReadOnlyCollection<string> expected)
    {
        var actual = typeof(T)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Select(property => property.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(
            expected.OrderBy(name => name, StringComparer.Ordinal),
            actual);
    }
}
