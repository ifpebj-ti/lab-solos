namespace LabSolos_Server_DotNet8.Services;

public sealed record LoanRuleViolation(string Code, string Message);

public static class LoanDomainRules
{
    public const int ReturnPeriodDays = 5;

    public static LoanRuleViolation? GetExpectedReturnDate(
        DateTimeOffset submittedAt, int days, out DateTime expectedReturnDate)
    {
        expectedReturnDate = default;
        if (days != ReturnPeriodDays)
        {
            return new("loan_return_period_invalid", "O prazo de devolução deve ser de cinco dias corridos.");
        }

        if (submittedAt.UtcDateTime > DateTime.MaxValue.AddDays(-ReturnPeriodDays))
        {
            return new("loan_return_date_out_of_range", "A data prevista de devolução está fora da faixa suportada.");
        }

        expectedReturnDate = submittedAt.UtcDateTime.AddDays(ReturnPeriodDays);
        return null;
    }

    public static LoanRuleViolation? ValidateDebit(float stock, int quantity, out float remaining) =>
        ChangeStock(stock, quantity, debit: true, out remaining);

    public static LoanRuleViolation? ValidateCredit(float stock, int quantity, out float restored) =>
        ChangeStock(stock, quantity, debit: false, out restored);

    private static LoanRuleViolation? ChangeStock(float stock, int quantity, bool debit, out float result)
    {
        result = stock;
        if (quantity <= 0)
        {
            return new("loan_quantity_invalid", "Informe uma quantidade inteira positiva.");
        }

        if (!float.IsFinite(stock) || stock < 0)
        {
            return new("loan_stock_invalid", "O saldo do produto precisa ser conferido antes do empréstimo.");
        }

        if (debit && stock < quantity)
        {
            return new("loan_insufficient_stock", "A quantidade solicitada excede o saldo disponível.");
        }

        var signedQuantity = debit ? -(double)quantity : quantity;
        var candidate = (float)(stock + signedQuantity);
        // Both the requested quantity and the prior balance must survive float rounding.
        if (!float.IsFinite(candidate) || candidate < 0
            || !SameExactValue((double)candidate - stock, signedQuantity)
            || !SameExactValue((double)candidate - signedQuantity, stock))
        {
            return new("loan_stock_out_of_range", "A movimentação excede a precisão ou a faixa suportada pelo saldo.");
        }

        result = candidate;
        return null;
    }

    private static bool SameExactValue(double left, double right)
    {
        const long magnitudeMask = 0x7FFF_FFFF_FFFF_FFFFL;
        var leftBits = BitConverter.DoubleToInt64Bits(left);
        var rightBits = BitConverter.DoubleToInt64Bits(right);
        return leftBits == rightBits ||
            ((leftBits & magnitudeMask) == 0 && (rightBits & magnitudeMask) == 0);
    }
}
