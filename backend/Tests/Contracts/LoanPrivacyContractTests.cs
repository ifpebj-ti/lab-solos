using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace Tests.Contracts;

public sealed class LoanPrivacyContractTests
{
    [Fact]
    public void LoanAccompanimentDtoUsesAnExplicitNonRecursiveAllowlist()
    {
        var assembly = typeof(EmprestimoDTO).Assembly;
        var loanType = assembly.GetType(
            "LabSolos_Server_DotNet8.DTOs.Emprestimos.EmprestimoAcompanhamentoDTO",
            throwOnError: false);

        Assert.NotNull(loanType);
        AssertPropertyNames(
            loanType!,
            "Aprovador",
            "DataAprovacao",
            "DataDevolucao",
            "DataPrevistaDevolucao",
            "DataRealizacao",
            "Id",
            "Produtos",
            "Solicitante",
            "Status");
        Assert.Equal(
            typeof(List<ProdutoEmprestadoAcompanhamentoDTO>),
            loanType!.GetProperty("Produtos")!.PropertyType);

        var userType = loanType.GetProperty("Solicitante")!.PropertyType;
        Assert.Equal(userType, loanType.GetProperty("Aprovador")!.PropertyType);
        AssertPropertyNames(
            userType,
            "DataIngresso",
            "Email",
            "Id",
            "NivelUsuario",
            "NomeCompleto",
            "Responsavel",
            "Status",
            "Telefone",
            "TipoUsuario");
        var responsibleType = userType.GetProperty("Responsavel")!.PropertyType;
        AssertPropertyNames(
            responsibleType,
            "Cidade",
            "Curso",
            "DataIngresso",
            "Email",
            "Id",
            "Instituicao",
            "NivelUsuario",
            "NomeCompleto",
            "Status",
            "Telefone");
        Assert.DoesNotContain(
            userType.GetProperties(),
            property => typeof(IEnumerable<Usuario>).IsAssignableFrom(property.PropertyType) ||
                property.PropertyType == typeof(Usuario) ||
                property.Name.Contains("Senha", StringComparison.OrdinalIgnoreCase) ||
                property.Name.Contains("Token", StringComparison.OrdinalIgnoreCase) ||
                property.Name.Contains("Sessao", StringComparison.OrdinalIgnoreCase));

        var productType = assembly.GetType(
            "LabSolos_Server_DotNet8.DTOs.Emprestimos.ProdutoAcompanhamentoDTO",
            throwOnError: true)!;
        AssertPropertyNames(
            productType,
            "Catmat",
            "DataFabricacao",
            "DataValidade",
            "Fornecedor",
            "Id",
            "Lote",
            "LocalizacaoProduto",
            "NomeProduto",
            "Quantidade",
            "QuantidadeMinima",
            "Status",
            "TipoProduto",
            "UltimaModificacao",
            "UnidadeMedida");

        var lotType = assembly.GetType(
            "LabSolos_Server_DotNet8.DTOs.Emprestimos.LoteAcompanhamentoDTO",
            throwOnError: true)!;
        AssertPropertyNames(
            lotType,
            "CodigoLote",
            "DataEntrada",
            "DataFabricacao",
            "DataValidade",
            "Fornecedor",
            "Produtos");
        Assert.Empty(new LoteAcompanhamentoDTO { CodigoLote = "synthetic-lot" }.Produtos);
    }

    [Fact]
    public void LoanUserResponsibleSummaryDoesNotContainPrivateOrRecursiveFields()
    {
        var properties = typeof(EmprestimoResponsavelAcompanhamentoDTO).GetProperties();

        Assert.DoesNotContain(properties, property =>
            typeof(IEnumerable<Usuario>).IsAssignableFrom(property.PropertyType) ||
            property.PropertyType == typeof(Usuario) ||
            property.Name.Contains("Senha", StringComparison.OrdinalIgnoreCase) ||
            property.Name.Contains("Token", StringComparison.OrdinalIgnoreCase) ||
            property.Name.Contains("Sessao", StringComparison.OrdinalIgnoreCase));
    }

    private static void AssertPropertyNames(Type type, params string[] expected)
    {
        Assert.Equal(
            expected.Order(StringComparer.Ordinal),
            type.GetProperties().Select(property => property.Name).Order(StringComparer.Ordinal));
    }
}
