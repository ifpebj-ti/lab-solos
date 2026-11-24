using System.Globalization;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;

namespace Tests.Services;

public class ProductStockAlertRuleTests
{
    [Theory]
    [InlineData(4f, 5f, true)]
    [InlineData(5f, 5f, false)]
    [InlineData(6f, 5f, false)]
    [InlineData(4.99f, 5f, true)]
    [InlineData(5.01f, 5f, false)]
    [InlineData(0f, 0f, false)]
    [InlineData(0f, 1f, true)]
    [InlineData(1f, 0f, false)]
    public void BelowMinimumRequiresQuantityStrictlyBelowMinimum(
        float quantity,
        float minimumQuantity,
        bool expected)
    {
        var product = CreateProduct(quantity, minimumQuantity);

        var result = ProductStockAlertRule.BelowMinimum.Compile()(product);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(null, 4f, true)]
    [InlineData("2000-01-01", 4f, true)]
    [InlineData("2026-11-16", 4f, true)]
    [InlineData("2100-01-01", 4f, true)]
    [InlineData(null, 5f, false)]
    [InlineData("2000-01-01", 5f, false)]
    [InlineData("2026-11-16", 5f, false)]
    [InlineData("2100-01-01", 5f, false)]
    public void BelowMinimumIsIndependentOfExpirationDate(
        string? expirationDate,
        float quantity,
        bool expected)
    {
        var product = CreateProduct(quantity, 5f);
        product.DataValidade = expirationDate is null
            ? null
            : DateTime.ParseExact(expirationDate, "yyyy-MM-dd", CultureInfo.InvariantCulture);

        var result = ProductStockAlertRule.BelowMinimum.Compile()(product);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void BelowMinimumCanFilterAProductQuery()
    {
        var below = CreateProduct(4f, 5f);
        var equal = CreateProduct(5f, 5f);
        var above = CreateProduct(6f, 5f);
        var products = new[] { below, equal, above }.AsQueryable();

        var result = products.Where(ProductStockAlertRule.BelowMinimum).ToArray();

        Assert.Same(below, Assert.Single(result));
    }

    private static Produto CreateProduct(float quantity, float minimumQuantity)
    {
        return new Produto
        {
            NomeProduto = "Produto sintético",
            Quantidade = quantity,
            QuantidadeMinima = minimumQuantity,
            Status = StatusProduto.Disponivel
        };
    }
}
