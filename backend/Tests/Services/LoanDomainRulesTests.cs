using LabSolos_Server_DotNet8.Services;

namespace Tests.Services;

public sealed class LoanDomainRulesTests
{
    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(6)]
    [InlineData(int.MaxValue)]
    public void NewRequestsRequireFiveDays(int days)
    {
        var error = LoanDomainRules.GetExpectedReturnDate(
            new DateTimeOffset(2026, 11, 16, 13, 0, 0, TimeSpan.FromHours(-3)), days, out _);

        Assert.Equal("loan_return_period_invalid", error?.Code);
    }

    [Fact]
    public void ExpectedDateUsesSubmissionInstantAndKeepsUtc()
    {
        var error = LoanDomainRules.GetExpectedReturnDate(
            new DateTimeOffset(2026, 11, 16, 13, 0, 0, TimeSpan.FromHours(-3)), 5, out var date);

        Assert.Null(error);
        Assert.Equal(new DateTime(2026, 11, 21, 16, 0, 0, DateTimeKind.Utc), date);
        Assert.Equal(DateTimeKind.Utc, date.Kind);
    }

    [Fact]
    public void ExpectedDateRejectsOverflowBeforeCalculation()
    {
        var error = LoanDomainRules.GetExpectedReturnDate(DateTimeOffset.MaxValue, 5, out _);

        Assert.Equal("loan_return_date_out_of_range", error?.Code);
    }

    [Theory]
    [InlineData(10f, 10, 0f)]
    [InlineData(10f, 1, 9f)]
    [InlineData(10.5f, 2, 8.5f)]
    [InlineData(2147483648f, int.MaxValue, 1f)]
    public void DebitSupportsAvailableQuantityAndFractionalBalances(float stock, int quantity, float expected)
    {
        Assert.Null(LoanDomainRules.ValidateDebit(stock, quantity, out var result));
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(10f, -1, "loan_quantity_invalid")]
    [InlineData(10f, 0, "loan_quantity_invalid")]
    [InlineData(10f, 11, "loan_insufficient_stock")]
    [InlineData(-1f, 1, "loan_stock_invalid")]
    [InlineData(float.NaN, 1, "loan_stock_invalid")]
    [InlineData(float.PositiveInfinity, 1, "loan_stock_invalid")]
    [InlineData(float.MaxValue, 1, "loan_stock_out_of_range")]
    [InlineData(16777218f, 1, "loan_stock_out_of_range")]
    public void InvalidDebitPreservesInput(float stock, int quantity, string code)
    {
        var error = LoanDomainRules.ValidateDebit(stock, quantity, out var result);

        Assert.Equal(code, error?.Code);
        Assert.Equal(stock, result);
    }

    [Theory]
    [InlineData(float.MaxValue)]
    [InlineData(16777216f)]
    [InlineData(float.Epsilon)]
    public void CreditRejectsLostOrUnrepresentableStock(float stock)
    {
        var error = LoanDomainRules.ValidateCredit(stock, 1, out var result);

        Assert.Equal("loan_stock_out_of_range", error?.Code);
        Assert.Equal(stock, result);
    }

    [Theory]
    [InlineData(0f, 3, 3f)]
    [InlineData(7f, 3, 10f)]
    [InlineData(0.5f, 3, 3.5f)]
    public void CreditRestoresRepresentableBalance(float stock, int quantity, float expected)
    {
        Assert.Null(LoanDomainRules.ValidateCredit(stock, quantity, out var result));
        Assert.Equal(expected, result);
    }
}
