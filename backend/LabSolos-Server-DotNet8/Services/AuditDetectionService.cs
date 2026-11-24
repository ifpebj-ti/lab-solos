using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services;

public enum AuditDetectionAxis
{
    Conta,
    Origem
}

public sealed record AuditDetectionRule(
    string Codigo,
    int Versao,
    AuditDetectionAxis Eixo,
    TimeSpan Janela,
    int Limite,
    int Precedencia);

public sealed record AuditDetectionResult(
    AuditDetectionCategory Categoria,
    string? CodigoRegra,
    int? VersaoRegra,
    int? QuantidadeObservada,
    DateTimeOffset AvaliadaEmUtc);

public static class AuditDetectionRuleCatalog
{
    public const int CurrentVersion = 1;
    public const string FalhasPorContaCodigo = "falhas-login-conta-15min";
    public const string FalhasPorOrigemCodigo = "falhas-login-origem-15min";

    private static readonly IReadOnlyList<AuditDetectionRule> Rules = Array.AsReadOnly(
    [
        new AuditDetectionRule(
            FalhasPorContaCodigo,
            CurrentVersion,
            AuditDetectionAxis.Conta,
            TimeSpan.FromMinutes(15),
            Limite: 5,
            Precedencia: 1),
        new AuditDetectionRule(
            FalhasPorOrigemCodigo,
            CurrentVersion,
            AuditDetectionAxis.Origem,
            TimeSpan.FromMinutes(15),
            Limite: 30,
            Precedencia: 2)
    ]);

    public static IReadOnlyList<AuditDetectionRule> ObterRegras() => Rules;
}

public sealed class AuditDetectionService
{
    private readonly IReadOnlyList<AuditDetectionRule> _rules;

    public AuditDetectionService()
        : this(AuditDetectionRuleCatalog.ObterRegras())
    {
    }

    public AuditDetectionService(IEnumerable<AuditDetectionRule> rules)
    {
        ArgumentNullException.ThrowIfNull(rules);
        _rules = rules
            .OrderBy(rule => rule.Precedencia)
            .ToArray();
        if (_rules.Count == 0 || _rules.Any(rule =>
                string.IsNullOrWhiteSpace(rule.Codigo) ||
                rule.Versao <= 0 ||
                rule.Janela <= TimeSpan.Zero ||
                rule.Limite <= 0 ||
                rule.Precedencia <= 0))
        {
            throw new ArgumentException("O catálogo de detecção contém uma regra inválida.", nameof(rules));
        }
    }

    public AuditDetectionResult Avaliar(
        LogAuditoria evento,
        int falhasNaJanelaDaConta,
        int falhasNaJanelaDaOrigem,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(evento);
        ArgumentOutOfRangeException.ThrowIfNegative(falhasNaJanelaDaConta);
        ArgumentOutOfRangeException.ThrowIfNegative(falhasNaJanelaDaOrigem);
        var instanteUtc = agora.ToUniversalTime();

        if (evento.TipoAcao == TipoAcaoAuditoria.LoginFalhado)
        {
            foreach (var rule in _rules)
            {
                if (rule.Eixo == AuditDetectionAxis.Conta &&
                    evento.UsuarioId is > 0 &&
                    falhasNaJanelaDaConta >= rule.Limite)
                {
                    return Suspicious(rule, falhasNaJanelaDaConta, instanteUtc);
                }

                if (rule.Eixo == AuditDetectionAxis.Origem &&
                    !string.IsNullOrWhiteSpace(evento.EnderecoIP) &&
                    falhasNaJanelaDaOrigem >= rule.Limite)
                {
                    return Suspicious(rule, falhasNaJanelaDaOrigem, instanteUtc);
                }
            }
        }

        var category = evento.OrigemConfiavel == OrigemConfiavelAuditoria.SemAtorValido
            ? AuditDetectionCategory.SemAtorValido
            : AuditDetectionCategory.AtividadeNormal;

        return new AuditDetectionResult(category, null, null, null, instanteUtc);
    }

    public AuditDetectionRule ObterRegra(AuditDetectionAxis eixo) =>
        _rules.Single(rule => rule.Eixo == eixo);

    private static AuditDetectionResult Suspicious(
        AuditDetectionRule rule,
        int observedCount,
        DateTimeOffset evaluatedAt) => new(
        AuditDetectionCategory.AtividadeSuspeita,
        rule.Codigo,
        rule.Versao,
        observedCount,
        evaluatedAt);
}
