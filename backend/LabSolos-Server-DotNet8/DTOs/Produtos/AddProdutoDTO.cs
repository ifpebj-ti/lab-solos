using System.ComponentModel.DataAnnotations;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public partial class AddProdutoDTO : IValidatableObject
    {
        public required string NomeProduto { get; set; }
        public required string Tipo { get; set; } // Enum
        public required float Quantidade { get; set; }
        public required float QuantidadeMinima { get; set; }
        public string? LocalizacaoProduto { get; set; }
        public string? DataFabricacao { get; set; }
        public string? DataValidade { get; set; }
        public string? DataValidadeConfirmada { get; set; }
        public string? Fornecedor { get; set; }
        public string? Catmat { get; set; } = string.Empty;
        public string? UnidadeMedida { get; set; } = string.Empty;
        public string? EstadoFisico { get; set; } = string.Empty;
        public string? Cor { get; set; } = string.Empty;
        public string? Odor { get; set; } = string.Empty;
        public string? FormulaQuimica { get; set; } = string.Empty;
        public decimal? PesoMolecular { get; set; }
        public float? Densidade { get; set; }
        public string? GrauPureza { get; set; } = string.Empty;
        public string? Grupo { get; set; } = string.Empty;
        public string? Material { get; set; } = string.Empty;
        public string? Formato { get; set; } = string.Empty;
        public string? Altura { get; set; } = string.Empty;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var ehQuimico = Enum.TryParse<TipoProduto>(Tipo, ignoreCase: true, out var tipoProduto)
                && tipoProduto == TipoProduto.Quimico;

            if (ehQuimico
                && FormulaQuimica is { Length: > 0 } formula
                && (formula.Length > 50 || !FormulaQuimicaEhValida(formula)))
            {
                yield return new ValidationResult(
                    "A fórmula deve ter no máximo 50 caracteres e usar apenas caracteres válidos.",
                    ["formulaQuimica"]);
            }

            if (ehQuimico && PesoMolecular is { } pesoMolecular && !PesoMolecularEhValido(pesoMolecular))
            {
                yield return new ValidationResult(
                    "Informe um Peso Molecular entre 0,001 e 10.000 g/mol com até três casas decimais.",
                    ["pesoMolecular"]);
            }

            if (ehQuimico
                && !string.IsNullOrEmpty(DataValidadeConfirmada)
                && !DateOnly.TryParseExact(
                    DataValidadeConfirmada,
                    "yyyy-MM-dd",
                    global::System.Globalization.CultureInfo.InvariantCulture,
                    global::System.Globalization.DateTimeStyles.None,
                    out _))
            {
                yield return new ValidationResult(
                    "A confirmação da validade deve usar o formato AAAA-MM-DD.",
                    ["dataValidadeConfirmada"]);
            }
        }

        private static bool PesoMolecularEhValido(decimal valor)
        {
            if (valor < 0.001m || valor > 10_000m)
            {
                return false;
            }

            var scale = (decimal.GetBits(valor)[3] >> 16) & 0x7F;
            return scale <= 3;
        }

        private static bool FormulaQuimicaEhValida(string formula) => formula.All(caractere =>
            char.IsAsciiLetterOrDigit(caractere)
            || caractere is >= '₀' and <= '₉'
            || caractere is '(' or ')' or '-' or '+' or ',' or '.' or ' ');
    }
}
