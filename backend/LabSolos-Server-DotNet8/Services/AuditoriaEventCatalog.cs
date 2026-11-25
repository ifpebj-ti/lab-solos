using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services;

public sealed record DefinicaoEventoAuditoria(
    CodigoEventoAuditoria Codigo,
    string Acao,
    string Recurso,
    CategoriaRegistroAuditoria Categoria,
    TimeSpan Retencao,
    TipoAcaoAuditoria TipoAcao,
    NivelRiscoAuditoria NivelRisco,
    IReadOnlySet<OrigemConfiavelAuditoria> OrigensPermitidas,
    bool SomenteLegado = false);

public static partial class AuditoriaEventCatalog
{
    private static readonly Regex SafeReferencePattern = new(
        "^[A-Za-z0-9:_-]{1,64}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static readonly TimeSpan RetencaoTrilhaObrigatoria = TimeSpan.FromDays(365);
    public static readonly TimeSpan RetencaoDiagnosticoOperacional = TimeSpan.FromDays(30);

    private static readonly IReadOnlySet<OrigemConfiavelAuditoria> UserOnly =
        new HashSet<OrigemConfiavelAuditoria>
        {
            OrigemConfiavelAuditoria.UsuarioAutenticado
        };

    private static readonly IReadOnlySet<OrigemConfiavelAuditoria> UserOrProcess =
        new HashSet<OrigemConfiavelAuditoria>
        {
            OrigemConfiavelAuditoria.UsuarioAutenticado,
            OrigemConfiavelAuditoria.ProcessoAutorizado
        };

    private static readonly IReadOnlySet<OrigemConfiavelAuditoria> AnyOrigin =
        new HashSet<OrigemConfiavelAuditoria>
        {
            OrigemConfiavelAuditoria.UsuarioAutenticado,
            OrigemConfiavelAuditoria.ProcessoAutorizado,
            OrigemConfiavelAuditoria.SemAtorValido
        };

    private static readonly ReadOnlyDictionary<CodigoEventoAuditoria, DefinicaoEventoAuditoria> Definitions =
        new ReadOnlyDictionary<CodigoEventoAuditoria, DefinicaoEventoAuditoria>(
            new Dictionary<CodigoEventoAuditoria, DefinicaoEventoAuditoria>
            {
                [CodigoEventoAuditoria.DecisaoConta] = Required(
                    CodigoEventoAuditoria.DecisaoConta, "decisao_conta", "conta", TipoAcaoAuditoria.AlteracaoUsuario),
                [CodigoEventoAuditoria.ConcessaoConta] = Required(
                    CodigoEventoAuditoria.ConcessaoConta, "concessao_conta", "conta", TipoAcaoAuditoria.AlteracaoUsuario),
                [CodigoEventoAuditoria.TrocaEmail] = Required(
                    CodigoEventoAuditoria.TrocaEmail, "troca_email", "conta", TipoAcaoAuditoria.AlteracaoUsuario),
                [CodigoEventoAuditoria.BaixaEmprestimo] = Required(
                    CodigoEventoAuditoria.BaixaEmprestimo, "baixa_emprestimo", "emprestimo", TipoAcaoAuditoria.OperacaoEmLote),
                [CodigoEventoAuditoria.DevolucaoEmprestimo] = Required(
                    CodigoEventoAuditoria.DevolucaoEmprestimo, "devolucao_emprestimo", "emprestimo", TipoAcaoAuditoria.DevolucaoEmprestimo),
                [CodigoEventoAuditoria.EmissaoNotificacao] = Required(
                    CodigoEventoAuditoria.EmissaoNotificacao, "emissao_notificacao", "notificacao", TipoAcaoAuditoria.Outro,
                    UserOrProcess),
                [CodigoEventoAuditoria.ExclusaoNotificacao] = Required(
                    CodigoEventoAuditoria.ExclusaoNotificacao, "exclusao_notificacao", "notificacao", TipoAcaoAuditoria.Outro,
                    new HashSet<OrigemConfiavelAuditoria> { OrigemConfiavelAuditoria.UsuarioAutenticado }),
                [CodigoEventoAuditoria.FalhaOperacao] = Diagnostic(
                    CodigoEventoAuditoria.FalhaOperacao, "falha_operacao", AnyOrigin),
                [CodigoEventoAuditoria.TentativaSemIdentidadeValida] = Diagnostic(
                    CodigoEventoAuditoria.TentativaSemIdentidadeValida, "tentativa_sem_identidade_valida",
                    new HashSet<OrigemConfiavelAuditoria> { OrigemConfiavelAuditoria.SemAtorValido }),
                [CodigoEventoAuditoria.LegadoNaoClassificado] = new DefinicaoEventoAuditoria(
                    CodigoEventoAuditoria.LegadoNaoClassificado,
                    "legado_nao_classificado",
                    "legado",
                    CategoriaRegistroAuditoria.DiagnosticoOperacional,
                    RetencaoDiagnosticoOperacional,
                    TipoAcaoAuditoria.Outro,
                    NivelRiscoAuditoria.Baixo,
                    AnyOrigin,
                    SomenteLegado: true)
            });

    public static DefinicaoEventoAuditoria Obter(CodigoEventoAuditoria codigo)
    {
        if (!Definitions.TryGetValue(codigo, out var definition))
            throw new ArgumentOutOfRangeException(nameof(codigo), codigo, "Código de evento de auditoria desconhecido.");

        return definition;
    }

    public static bool ReferenciaSegura(string? reference) =>
        string.IsNullOrEmpty(reference) || SafeReferencePattern.IsMatch(reference);

    private static DefinicaoEventoAuditoria Required(
        CodigoEventoAuditoria code,
        string action,
        string resource,
        TipoAcaoAuditoria actionType,
        IReadOnlySet<OrigemConfiavelAuditoria>? origins = null) =>
        new(
            code,
            action,
            resource,
            CategoriaRegistroAuditoria.TrilhaObrigatoria,
            RetencaoTrilhaObrigatoria,
            actionType,
            NivelRiscoAuditoria.Alto,
            origins ?? UserOnly);

    private static DefinicaoEventoAuditoria Diagnostic(
        CodigoEventoAuditoria code,
        string action,
        IReadOnlySet<OrigemConfiavelAuditoria> origins) =>
        new(
            code,
            action,
            "operacao",
            CategoriaRegistroAuditoria.DiagnosticoOperacional,
            RetencaoDiagnosticoOperacional,
            TipoAcaoAuditoria.Outro,
            NivelRiscoAuditoria.Medio,
            origins);
}
