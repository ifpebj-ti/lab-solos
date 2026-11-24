using System.Linq.Expressions;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services;

public static class ProductStockAlertRule
{
    public static Expression<Func<Produto, bool>> BelowMinimum { get; } =
        product => product.Quantidade < product.QuantidadeMinima;
}
