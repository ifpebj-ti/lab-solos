using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;

namespace Tests.Services;

public sealed class AuditDetectionServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 23, 15, 0, 0, TimeSpan.Zero);
    private readonly AuditDetectionService _service = new();

    [Fact]
    public void FifthFailureWithinWindowUsesAccountRuleBeforeOriginRule()
    {
        var result = _service.Avaliar(
            LoginFailure(OrigemConfiavelAuditoria.UsuarioAutenticado, usuarioId: 17, ip: "192.0.2.17"),
            falhasNaJanelaDaConta: 5,
            falhasNaJanelaDaOrigem: 30,
            Now);

        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, result.Categoria);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorContaCodigo, result.CodigoRegra);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, result.VersaoRegra);
        Assert.Equal(5, result.QuantidadeObservada);
    }

    [Fact]
    public void ThirtiethFailureFromOriginUsesOriginRuleWhenThereIsNoAccount()
    {
        var result = _service.Avaliar(
            LoginFailure(OrigemConfiavelAuditoria.SemAtorValido, usuarioId: null, ip: "192.0.2.30"),
            falhasNaJanelaDaConta: 0,
            falhasNaJanelaDaOrigem: 30,
            Now);

        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, result.Categoria);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorOrigemCodigo, result.CodigoRegra);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, result.VersaoRegra);
        Assert.Equal(30, result.QuantidadeObservada);
    }

    [Fact]
    public void BelowBothThresholdsIsNormalAndCarriesNoAppliedRule()
    {
        var result = _service.Avaliar(
            LoginFailure(OrigemConfiavelAuditoria.UsuarioAutenticado, usuarioId: 18, ip: "192.0.2.18"),
            falhasNaJanelaDaConta: 4,
            falhasNaJanelaDaOrigem: 29,
            Now);

        Assert.Equal(AuditDetectionCategory.AtividadeNormal, result.Categoria);
        Assert.Null(result.CodigoRegra);
        Assert.Null(result.VersaoRegra);
        Assert.Null(result.QuantidadeObservada);
    }

    [Fact]
    public void EventWithoutValidActorRemainsExplicitWhenOriginHasNoThreshold()
    {
        var result = _service.Avaliar(
            LoginFailure(OrigemConfiavelAuditoria.SemAtorValido, usuarioId: null, ip: null),
            falhasNaJanelaDaConta: 0,
            falhasNaJanelaDaOrigem: 0,
            Now);

        Assert.Equal(AuditDetectionCategory.SemAtorValido, result.Categoria);
        Assert.Null(result.CodigoRegra);
        Assert.Null(result.VersaoRegra);
    }

    [Fact]
    public void NonLoginEventDoesNotMatchAuthenticationRules()
    {
        var result = _service.Avaliar(
            new LogAuditoria
            {
                TipoAcao = TipoAcaoAuditoria.AcessoAdministrativo,
                NivelRisco = NivelRiscoAuditoria.Critico,
                OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
                UsuarioId = 17,
                EnderecoIP = "192.0.2.17"
            },
            falhasNaJanelaDaConta: 5,
            falhasNaJanelaDaOrigem: 30,
            Now);

        Assert.Equal(AuditDetectionCategory.AtividadeNormal, result.Categoria);
        Assert.Null(result.CodigoRegra);
    }

    [Fact]
    public void RepeatingEvaluationWithTheSameInputsIsDeterministic()
    {
        var input = LoginFailure(
            OrigemConfiavelAuditoria.UsuarioAutenticado,
            usuarioId: 19,
            ip: "192.0.2.19");

        var first = _service.Avaliar(input, 5, 30, Now);
        var second = _service.Avaliar(input, 5, 30, Now);

        Assert.Equal(first, second);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorContaCodigo, first.CodigoRegra);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, first.VersaoRegra);
    }

    private static LogAuditoria LoginFailure(
        OrigemConfiavelAuditoria origin,
        int? usuarioId,
        string? ip) => new()
    {
        TipoAcao = TipoAcaoAuditoria.LoginFalhado,
        OrigemConfiavel = origin,
        UsuarioId = usuarioId,
        EnderecoIP = ip ?? string.Empty,
        Resultado = ResultadoOperacaoAuditoria.Negado,
        DataHora = Now.UtcDateTime
    };
}
