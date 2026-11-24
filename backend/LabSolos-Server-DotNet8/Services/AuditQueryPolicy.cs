using System.Globalization;
using System.Text;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.DTOs.Paginacao;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services.Security;

namespace LabSolos_Server_DotNet8.Services;

public interface IAuditQueryPolicy
{
    bool TryCreatePagination(
        string? paginaInformada,
        string? tamanhoPaginaInformado,
        out ParametrosPaginacao parametros,
        out string parametroInvalido);
    Task<OperationAdmissionResult> AdmitQueryAsync(int administradorId, CancellationToken cancellationToken);
    Task<OperationAdmissionResult> AdmitExportAsync(int administradorId, CancellationToken cancellationToken);
    Task<ResultadoPaginado<AuditLogProjectionDTO>> ConsultarAsync(
        FiltroAuditoriaDTO filtro,
        ParametrosPaginacao parametros,
        CancellationToken cancellationToken);
    Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(
        FiltroAuditoriaDTO filtro,
        CancellationToken cancellationToken);
    Task<AuditExportReadResult> PrepararExportacaoAsync(
        FiltroAuditoriaDTO filtro,
        CancellationToken cancellationToken);
    string SerializarCsv(IEnumerable<AuditLogProjectionDTO> itens);
}

public sealed class AuditQueryPolicy(
    IUnitOfWork unitOfWork,
    OperationAdmissionPolicy admissionPolicy) : IAuditQueryPolicy
{
    public const int MaximumExportRecords = 5_000;

    private readonly IUnitOfWork _unitOfWork =
        unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
    private readonly OperationAdmissionPolicy _admissionPolicy =
        admissionPolicy ?? throw new ArgumentNullException(nameof(admissionPolicy));

    public bool TryCreatePagination(
        string? paginaInformada,
        string? tamanhoPaginaInformado,
        out ParametrosPaginacao parametros,
        out string parametroInvalido) =>
        ParametrosPaginacao.TentarCriar(
            paginaInformada,
            tamanhoPaginaInformado,
            out parametros,
            out parametroInvalido);

    public Task<OperationAdmissionResult> AdmitQueryAsync(
        int administradorId,
        CancellationToken cancellationToken) =>
        _admissionPolicy.AdmitAuditQueryAsync(administradorId, cancellationToken);

    public Task<OperationAdmissionResult> AdmitExportAsync(
        int administradorId,
        CancellationToken cancellationToken) =>
        _admissionPolicy.AdmitAuditExportAsync(administradorId, cancellationToken);

    public async Task<ResultadoPaginado<AuditLogProjectionDTO>> ConsultarAsync(
        FiltroAuditoriaDTO filtro,
        ParametrosPaginacao parametros,
        CancellationToken cancellationToken)
    {
        var pagina = await _unitOfWork.LogAuditoriaRepository.ObterPaginaFiltradaAsync(filtro, parametros, cancellationToken);
        return pagina.Projetar(Project);
    }

    public Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(
        FiltroAuditoriaDTO filtro,
        CancellationToken cancellationToken) =>
        _unitOfWork.LogAuditoriaRepository.GerarRelatorioFiltradoAsync(filtro, cancellationToken);

    public async Task<AuditExportReadResult> PrepararExportacaoAsync(
        FiltroAuditoriaDTO filtro,
        CancellationToken cancellationToken)
    {
        var resultado = await _unitOfWork.LogAuditoriaRepository.ObterRecorteExportacaoAsync(
            filtro,
            MaximumExportRecords,
            cancellationToken);
        return new AuditExportReadResult(
            resultado.TotalItens,
            resultado.Itens.Select(Project).ToArray());
    }

    public string SerializarCsv(IEnumerable<AuditLogProjectionDTO> itens)
    {
        var csv = new StringBuilder();
        csv.AppendLine("id,codigoEvento,acao,recurso,dataHoraUtc,origem,resultado,suspeita,categoriaDeteccao,codigoRegraDeteccao,versaoRegraDeteccao,quantidadeObservadaDeteccao,revisaoClassificacao");
        foreach (var item in itens)
        {
            csv.Append(item.Id.ToString(CultureInfo.InvariantCulture)).Append(',')
                .Append(Csv(item.CodigoEvento)).Append(',')
                .Append(Csv(item.Acao)).Append(',')
                .Append(Csv(item.Recurso)).Append(',')
                .Append(Csv(item.DataHoraUtc.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture))).Append(',')
                .Append(Csv(item.Origem)).Append(',')
                .Append(Csv(item.Resultado)).Append(',')
                .Append(item.Suspeita ? "true" : "false").Append(',')
                .Append(Csv(item.CategoriaDeteccao)).Append(',')
                .Append(Csv(item.CodigoRegraDeteccao ?? string.Empty)).Append(',')
                .Append(item.VersaoRegraDeteccao?.ToString(CultureInfo.InvariantCulture) ?? string.Empty).Append(',')
                .Append(item.QuantidadeObservadaDeteccao?.ToString(CultureInfo.InvariantCulture) ?? string.Empty).Append(',')
                .Append(item.RevisaoClassificacao.ToString(CultureInfo.InvariantCulture))
                .AppendLine();
        }

        return csv.ToString();
    }

    public static AuditLogProjectionDTO Project(LogAuditoria log) => new(
        log.Id,
        log.CodigoEvento.ToString(),
        log.Acao,
        log.Recurso,
        new DateTimeOffset(DateTime.SpecifyKind(log.DataHora, DateTimeKind.Utc)),
        log.OrigemConfiavel.ToString(),
        log.Resultado.ToString(),
        log.Suspeita,
        log.CategoriaDeteccao.ToString(),
        log.CodigoRegraDeteccao,
        log.VersaoRegraDeteccao,
        log.QuantidadeObservadaDeteccao,
        log.RevisaoClassificacao,
        log.RevisoesClassificacao
            .OrderBy(revision => revision.NumeroRevisao)
            .Select(revision => new AuditClassificationRevisionDTO
            {
                NumeroRevisao = revision.NumeroRevisao,
                SuspeitaAnterior = revision.SuspeitaAnterior,
                SuspeitaResultante = revision.SuspeitaResultante,
                Justificativa = revision.Justificativa,
                CriadaEmUtc = revision.CriadaEmUtc.ToUniversalTime(),
                AutorUsuarioId = revision.AutorUsuarioId,
                Origem = revision.Origem.ToString()
            })
            .ToArray());

    private static string Csv(string value)
    {
        var normalized = value;
        if (normalized.Length > 0 && normalized[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
            normalized = $"'{normalized}";

        return $"\"{normalized.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}
