using System.Globalization;
using System.Security.Claims;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services.Security;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IProdutoService
    {
        ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO);
        IReadOnlyList<string> CalcularMotivosAlerta(Produto produto, DateOnly hojeCivil);
        ProductExpiryConfirmationRequirement? AvaliarConfirmacaoValidade(AddProdutoDTO produtoDTO);
        Task<HistoricoSaidaProdutoResponseDTO?> ObterHistoricoSaidaProdutoAsync(
            int produtoId,
            ClaimsPrincipal principal,
            CancellationToken cancellationToken);
    }

    public sealed record ProductExpiryConfirmationRequirement(DateOnly DataValidade, DateOnly DiaCivil);

    public class ProdutoService : IProdutoService
    {
        private static readonly Func<Produto, bool> IsBelowMinimum =
            ProductStockAlertRule.BelowMinimum.Compile();
        private readonly ILogger<ProdutoService> _logger;
        private readonly ProductCivilDay _civilDay;
        private readonly ProductHistoryAccessService? _productHistoryAccess;

        public ProdutoService(
            ILogger<ProdutoService> logger,
            ProductCivilDay civilDay,
            ProductHistoryAccessService? productHistoryAccess = null)
        {
            _logger = logger;
            _civilDay = civilDay;
            _productHistoryAccess = productHistoryAccess;
        }

        public IReadOnlyList<string> CalcularMotivosAlerta(Produto produto, DateOnly hojeCivil)
        {
            ArgumentNullException.ThrowIfNull(produto);

            var motivos = new List<string>(capacity: 2);
            if (IsBelowMinimum(produto))
            {
                motivos.Add(ProdutoAlertaDTO.MotivoEstoqueAbaixoMinimo);
            }

            if (produto.DataValidade is { } validade &&
                ProductCivilDay.FromStoredDate(validade) <= hojeCivil.AddDays(10))
            {
                motivos.Add(ProdutoAlertaDTO.MotivoValidade);
            }

            return motivos;
        }

        public ResultadoValidacaoDTO ValidarEstruturaProduto(AddProdutoDTO produtoDTO)
        {
            if (Enum.TryParse<TipoProduto>(produtoDTO.Tipo, ignoreCase: true, out var tipo) &&
                tipo == TipoProduto.Quimico)
            {
                var errosPorCampo = new Dictionary<string, string[]>();
                if (!DataCivilOpcionalValida(produtoDTO.DataFabricacao))
                {
                    errosPorCampo["dataFabricacao"] = ["Data de fabricação inválida. Use o formato AAAA-MM-DD."];
                }

                if (!DataCivilOpcionalValida(produtoDTO.DataValidade))
                {
                    errosPorCampo["dataValidade"] = ["Data de validade inválida. Use o formato AAAA-MM-DD."];
                }

                var grupoValido = GrupoValidoParaCadastro(produtoDTO.Grupo);
                if (!grupoValido)
                {
                    errosPorCampo["grupo"] = ["Selecione um grupo válido para o cadastro do químico."];
                }

                if (errosPorCampo.Count > 0)
                {
                    return new ResultadoValidacaoDTO
                    {
                        Validado = false,
                        Mensagem = grupoValido
                            ? "Há datas inválidas no cadastro do químico."
                            : "Há campos inválidos no cadastro do químico.",
                        ErrosPorCampo = errosPorCampo
                    };
                }
            }

            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Quimico.ToString() && (
                string.IsNullOrEmpty(produtoDTO.DataValidade) ||
                string.IsNullOrEmpty(produtoDTO.UnidadeMedida) ||
                string.IsNullOrEmpty(produtoDTO.FormulaQuimica)))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Quimico', os campos 'DataValidade', 'UnidadeMedida' e 'FormulaQuimica' são obrigatórios"
                };
            }

            // Verificar se o tipo corresponde aos atributos fornecidos
            if (produtoDTO.Tipo == TipoProduto.Vidraria.ToString() && (
                !produtoDTO.Capacidade.HasValue))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false,
                    Mensagem = $"Para o tipo 'Vidraria', o campo 'Capacidade' é obrigatório"
                };
            }


            // Se todas as validações passarem
            return new ResultadoValidacaoDTO
            {
                Validado = true,
                Mensagem = string.Empty
            };
        }

        public ProductExpiryConfirmationRequirement? AvaliarConfirmacaoValidade(AddProdutoDTO produtoDTO)
        {
            if (!Enum.TryParse<TipoProduto>(produtoDTO.Tipo, ignoreCase: true, out var tipo)
                || tipo != TipoProduto.Quimico
                || !TentarLerDataCivil(produtoDTO.DataValidade, out var dataValidade))
            {
                return null;
            }

            var diaCivil = _civilDay.GetToday();
            if (dataValidade >= diaCivil)
            {
                return null;
            }

            var confirmacaoCorresponde = TentarLerDataCivil(
                    produtoDTO.DataValidadeConfirmada,
                    out var dataConfirmada)
                && dataConfirmada == dataValidade;

            return confirmacaoCorresponde
                ? null
                : new ProductExpiryConfirmationRequirement(dataValidade, diaCivil);
        }

        private static bool DataCivilOpcionalValida(string? valor)
        {
            return string.IsNullOrEmpty(valor) || TentarLerDataCivil(valor, out _);
        }

        private static bool TentarLerDataCivil(string? valor, out DateOnly data) =>
            DateOnly.TryParseExact(
                valor,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out data);

        public static bool CampoEditavel(string path) => path is
            "/nomeproduto" or "/quantidade" or "/quantidademinima" or "/fornecedor"
            or "/localizacaoproduto" or "/datafabricacao" or "/datavalidade" or "/status";

        public static bool CampoRemovivel(string path) =>
            path is "/fornecedor" or "/datafabricacao" or "/datavalidade";

        public static string CampoDeErro(string path) => path switch
        {
            "/nomeproduto" => "nomeProduto",
            "/quantidademinima" => "quantidadeMinima",
            "/localizacaoproduto" => "localizacaoProduto",
            "/datafabricacao" => "dataFabricacao",
            "/datavalidade" => "dataValidade",
            _ => path.TrimStart('/')
        };

        public static Dictionary<string, string[]> ValidarAlteracoesExplicitas(
            ProdutoDTOPatchRequest candidate, IReadOnlySet<string> paths)
        {
            var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            foreach (var path in paths)
            {
                var invalid = path switch
                {
                    "/nomeproduto" => string.IsNullOrWhiteSpace(candidate.NomeProduto) || candidate.NomeProduto.Length > 255,
                    "/quantidade" => candidate.Quantidade is not { } quantity || !float.IsFinite(quantity) || quantity < 0,
                    "/quantidademinima" => candidate.QuantidadeMinima is not { } minimum || !float.IsFinite(minimum) || minimum < 0,
                    "/fornecedor" => candidate.Fornecedor is { Length: > 255 },
                    "/localizacaoproduto" => candidate.LocalizacaoProduto is null || candidate.LocalizacaoProduto.Length > 255,
                    "/datafabricacao" => candidate.DataFabricacao is not null && !TentarLerDataCivil(candidate.DataFabricacao, out _),
                    "/datavalidade" => candidate.DataValidade is not null && !TentarLerDataCivil(candidate.DataValidade, out _),
                    "/status" => !Enum.GetNames<StatusProduto>().Contains(candidate.Status, StringComparer.OrdinalIgnoreCase),
                    _ => true
                };
                if (invalid)
                    errors[CampoDeErro(path)] = ["Informe um valor válido para este campo."];
            }

            if ((paths.Contains("/datafabricacao") || paths.Contains("/datavalidade"))
                && TentarLerDataCivil(candidate.DataFabricacao, out var manufactured)
                && TentarLerDataCivil(candidate.DataValidade, out var expires)
                && manufactured > expires)
                errors["dataFabricacao"] = ["A fabricação deve ocorrer até a validade."];

            return errors;
        }

        public static void AplicarAlteracoesExplicitas(
            Produto product, ProdutoDTOPatchRequest candidate, IReadOnlySet<string> paths)
        {
            foreach (var path in paths)
            {
                switch (path)
                {
                    case "/nomeproduto": product.NomeProduto = candidate.NomeProduto!; break;
                    case "/quantidade": product.Quantidade = candidate.Quantidade!.Value; break;
                    case "/quantidademinima": product.QuantidadeMinima = candidate.QuantidadeMinima!.Value; break;
                    case "/fornecedor": product.Fornecedor = candidate.Fornecedor; break;
                    case "/localizacaoproduto": product.LocalizacaoProduto = candidate.LocalizacaoProduto; break;
                    case "/datafabricacao": product.DataFabricacao = DataCivilAlterada(candidate.DataFabricacao); break;
                    case "/datavalidade": product.DataValidade = DataCivilAlterada(candidate.DataValidade); break;
                    case "/status": product.Status = Enum.Parse<StatusProduto>(candidate.Status!, ignoreCase: true); break;
                }
            }
        }

        private static DateTime? DataCivilAlterada(string? value) => value is null
            ? null
            : DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture)
                .ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        private static bool GrupoValidoParaCadastro(string? grupoInformado)
        {
            return grupoInformado is not null &&
                !grupoInformado.Contains(',') &&
                Enum.TryParse<Grupo>(grupoInformado, ignoreCase: true, out var grupo) &&
                Enum.IsDefined(grupo) &&
                grupo != Grupo.Indefinido;
        }

        public async Task<HistoricoSaidaProdutoResponseDTO?> ObterHistoricoSaidaProdutoAsync(
            int produtoId,
            ClaimsPrincipal principal,
            CancellationToken cancellationToken)
        {
            try
            {
                var historyAccess = _productHistoryAccess ??
                    throw new InvalidOperationException("A consulta de histórico não está configurada.");
                return await historyAccess.GetHistoryAsync(produtoId, principal, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter histórico de saída do produto {ProdutoId}", produtoId);
                throw;
            }
        }

    }
}
